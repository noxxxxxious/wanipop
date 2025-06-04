use crate::config::WanipopConfig;
use crate::wanikani::{self, ReviewResult, SubmittedReviewData};
use crate::AppState;
use futures::future::join_all;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct ReviewCard {
    pub assignment_id: u64,
    pub subject_id: u64,
    pub subject_type: String,
    pub characters: Option<String>,
    pub meanings: Vec<wanikani::Meaning>,
    pub readings: Option<Vec<wanikani::Reading>>,
    pub meaning_mnemonic: Option<String>,
    pub reading_mnemonic: Option<String>,
}

// Config commands

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> WanipopConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_api_key(state: State<'_, AppState>, key: String) -> Result<(), String> {
    let mut cfg = state.config.lock().unwrap();
    cfg.set_api_key(key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_num_of_reviews_per_batch(
    state: State<'_, AppState>,
    new_value: usize,
) -> Result<(), String> {
    let mut cfg = state.config.lock().unwrap();
    cfg.set_num_of_reviews_per_batch(new_value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_time_between_popups_in_minutes(
    state: State<'_, AppState>,
    new_value: usize,
) -> Result<(), String> {
    let mut cfg = state.config.lock().unwrap();
    cfg.set_time_between_popups_in_minutes(new_value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_hide_window_decorations(
    state: State<'_, AppState>,
    new_value: bool,
) -> Result<(), String> {
    let mut cfg = state.config.lock().unwrap();
    cfg.set_hide_window_decorations(new_value)
        .map_err(|e| e.to_string())
}

// User commands

#[tauri::command]
pub async fn get_wanikani_user(state: State<'_, AppState>) -> Result<String, String> {
    let api_key = get_api_key(&state)?;
    match wanikani::fetch_user(&state.http_client, api_key).await {
        Ok(user_data) => Ok(format!(
            "User: {}, Level: {}",
            user_data.username, user_data.level
        )),
        Err(e) => Err(format!("Failed to fetch user: {}", e)),
    }
}

// Review commands

#[tauri::command]
pub async fn check_for_reviews(state: State<'_, AppState>) -> Result<bool, String> {
    let api_key = get_api_key(&state)?;
    let summary = wanikani::fetch_summary(&state.http_client, api_key)
        .await
        .map_err(|e| format!("API error: {}", e))?;

    Ok(wanikani::has_available_reviews(&summary))
}

#[tauri::command]
pub async fn submit_wanikani_review(
    state: State<'_, AppState>,
    input: wanikani::ReviewResult, // now Deserialize + Serialize
) -> Result<String, String> {
    let api_key = get_api_key(&state)?;

    match wanikani::submit_review(&state.http_client, api_key, input).await {
        Ok(res) => Ok(format!(
            "Submitted review. SRS went from {} → {}",
            res.data.starting_srs_stage, res.data.ending_srs_stage
        )),
        Err(e) => Err(format!("Failed to submit review: {}", e)),
    }
}

fn get_api_key(state: &State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().unwrap();
    let key = config.wanikani_api_key.clone();
    match key {
        Some(key) => Ok(key),
        None => Err(format!("No api key set")),
    }
}

#[tauri::command]
pub async fn get_review_batch(state: State<'_, AppState>) -> Result<Vec<ReviewCard>, String> {
    // grab config
    let client = state.http_client.clone();
    let (api_key, batch_size) = {
        let cfg = state.config.lock().unwrap();
        let key = cfg.wanikani_api_key.clone().ok_or("API key not set")?;
        (key, cfg.num_of_reviews_per_batch)
    };
    drop(state);

    // 1. fetch summary
    let summary = wanikani::fetch_summary(&client, api_key.clone())
        .await
        .map_err(|e| format!("Summary error: {}", e))?;

    // 2. pick the first available bucket
    let now = chrono::Utc::now();
    let bucket = summary
        .reviews
        .into_iter()
        .find(|b| b.available_at <= now && !b.subject_ids.is_empty())
        .ok_or("No reviews available right now")?;

    // 3. choose up to batch_size random subject IDs
    let mut ids = bucket.subject_ids;
    if ids.len() > batch_size {
        use rand::seq::SliceRandom;
        let mut rng = rand::rng();
        ids.shuffle(&mut rng);
        ids.truncate(batch_size);
    }

    println!("Randomly chose these reviews to do:\n{:#?}", ids);

    // 4. fetch assignments & subjects in one go
    let assignments = wanikani::fetch_assignments_for_subjects(&client, api_key.clone(), &ids)
        .await
        .map_err(|e| format!("Assignments error: {}", e))?;

    println!("Fetched assignments:\n{:#?}", assignments);

    let subjects = wanikani::fetch_subjects(&client, api_key.clone(), &ids)
        .await
        .map_err(|e| format!("Subjects error: {}", e))?;

    println!("Fetched subjects:\n{:#?}", assignments);

    // 5. zip them into ReviewCard
    let cards = assignments
        .into_iter()
        .filter_map(|a| {
            subjects
                .iter()
                .find(|s| s.id == a.data.subject_id)
                .map(|s| ReviewCard {
                    assignment_id: a.id,
                    subject_id: s.id,
                    subject_type: a.data.subject_type.clone(),
                    characters: s.data.characters.clone(),
                    meanings: s.data.meanings.clone(),
                    readings: s.data.readings.clone(),
                    meaning_mnemonic: s.data.meaning_mnemonic.clone(),
                    reading_mnemonic: s.data.reading_mnemonic.clone(),
                })
        })
        .collect();

    println!("Cards to send to frontend:\n{:#?}", cards);

    Ok(cards)
}

#[tauri::command]
pub async fn submit_review_batch(
    state: State<'_, AppState>,
    payload: Vec<ReviewResult>,
) -> Result<Vec<SubmittedReviewData>, String> {
    // grab config
    let client = state.http_client.clone();
    let (api_key, batch_size) = {
        let cfg = state.config.lock().unwrap();
        let key = cfg.wanikani_api_key.clone().ok_or("API key not set")?;
        (key, cfg.num_of_reviews_per_batch)
    };
    drop(state);

    let tasks = payload.into_iter().map(|item| {
        let client = client.clone();
        let key = api_key.clone();
        async move {
            let response = wanikani::submit_review(&client, key, item)
                .await
                .map_err(|e| e.to_string())?;
            Ok(SubmittedReviewData {
                created_at: response.data_updated_at,
                assignment_id: response.data.assignment_id,
                subject_id: response.data.subject_id,
                starting_srs_stage: response.data.starting_srs_stage,
                ending_srs_stage: response.data.ending_srs_stage,
                incorrect_meaning_answers: response.data.incorrect_meaning_answers,
                incorrect_reading_answers: response.data.incorrect_reading_answers,
            })
        }
    });

    let results: Vec<Result<SubmittedReviewData, String>> = join_all(tasks).await;

    // partition successes and failures
    let (oks, errs): (Vec<_>, Vec<_>) = results.into_iter().partition(Result::is_ok);

    let oks: Vec<SubmittedReviewData> = oks.into_iter().map(Result::unwrap).collect();
    let errs: Vec<String> = errs.into_iter().map(Result::unwrap_err).collect();

    if !errs.is_empty() {
        Err(format!("{} reviews failed: {:?}", errs.len(), errs))
    } else {
        Ok(oks)
    }
}
