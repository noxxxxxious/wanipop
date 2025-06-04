use chrono::{DateTime, Utc};
use reqwest::{Client, RequestBuilder};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct Assignment {
    pub id: u64,
    pub object: String,
    pub url: String,
    pub data_updated_at: DateTime<Utc>,
    pub data: AssignmentData,
}

#[derive(Debug, Deserialize)]
pub struct AssignmentData {
    pub subject_id: u64,
    pub subject_type: String,
    pub available_at: Option<DateTime<Utc>>,
    pub srs_stage: u8,
}

#[derive(Debug, Deserialize)]
struct CollectionResponse<T> {
    pub object: String,
    pub url: String,
    pub pages: CollectionPages,
    pub total_count: isize,
    pub data_updated_at: DateTime<Utc>,
    pub data: Vec<T>,
}

#[derive(Debug, Deserialize)]
struct CollectionPages {
    pub next_url: Option<String>,
    pub previous_url: Option<String>,
    pub per_page: isize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meaning {
    pub meaning: String,
    pub primary: bool,
    pub accepted_answer: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reading {
    pub reading: String,
    pub primary: bool,
    pub accepted_answer: bool,
    pub r#type: Option<String>, // onyomi, kunyomi, etc.
}

#[derive(Debug, Serialize)]
struct ReviewPayload {
    pub review: ReviewResult,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewResult {
    pub assignment_id: u64,
    pub incorrect_meaning_answers: u8,
    pub incorrect_reading_answers: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewResponse {
    pub id: u64,
    pub object: String,
    pub url: String,
    pub data_updated_at: DateTime<Utc>,
    pub data: SubmittedReviewData,
}

#[derive(Debug, Deserialize)]
pub struct Subject {
    pub id: u64,
    pub object: String,
    pub url: String,
    pub data_updated_at: DateTime<Utc>,
    pub data: SubjectData,
}

#[derive(Debug, Deserialize)]
pub struct SubjectData {
    pub characters: Option<String>,
    pub meanings: Vec<Meaning>,
    pub readings: Option<Vec<Reading>>, // only for kanji and vocabulary
    pub level: u8,
    pub document_url: String,
    pub meaning_mnemonic: Option<String>,
    pub reading_mnemonic: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmittedReviewData {
    pub created_at: DateTime<Utc>,
    pub assignment_id: u64,
    pub subject_id: u64,
    pub starting_srs_stage: u8,
    pub ending_srs_stage: u8,
    pub incorrect_meaning_answers: u8,
    pub incorrect_reading_answers: u8,
}

#[derive(Debug, Deserialize)]
pub struct Subscription {
    pub active: bool,
    pub max_level_granted: u8,
    pub r#type: String,
}

#[derive(Debug, Deserialize)]
pub struct Summary {
    pub data: SummaryData,
}

#[derive(Debug, Deserialize)]
pub struct SummaryData {
    pub lessons: Vec<TimeBucket>,
    pub reviews: Vec<TimeBucket>,
    pub next_reviews_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct TimeBucket {
    pub available_at: DateTime<Utc>,
    pub subject_ids: Vec<u64>,
}

#[derive(Debug, Deserialize)]
pub struct User {
    pub username: String,
    pub level: u32,
    pub profile_url: String,
}

#[derive(Debug, Deserialize)]
pub struct UserData {
    pub id: String,
    pub username: String,
    pub level: u32,
    pub profile_url: String,
    pub subscription: Subscription,
}

#[derive(Debug, Deserialize)]
struct UserResponse {
    pub data: UserData,
}

trait WaniClient {
    fn wanikani_headers(self, api_key: String) -> RequestBuilder;
}

impl WaniClient for RequestBuilder {
    fn wanikani_headers(self, api_key: String) -> RequestBuilder {
        self.header("Authorization", format!("Bearer {}", api_key))
            .header("Wanikani-Revision", "20170710")
    }
}

pub async fn fetch_user(client: &Client, api_key: String) -> Result<UserData, reqwest::Error> {
    let user_data = client
        .get("https://api.wanikani.com/v2/user")
        .wanikani_headers(api_key)
        .send()
        .await?
        .error_for_status()?
        .json::<UserResponse>()
        .await?
        .data;

    Ok(user_data)
}

pub async fn fetch_summary(
    client: &Client,
    api_key: String,
) -> Result<SummaryData, reqwest::Error> {
    let response = client
        .get("https://api.wanikani.com/v2/summary")
        .wanikani_headers(api_key)
        .send()
        .await?
        .error_for_status()?
        .json::<Summary>()
        .await?;

    Ok(response.data)
}

pub fn has_available_reviews(summary: &SummaryData) -> bool {
    let now = Utc::now();
    summary
        .reviews
        .iter()
        .any(|bucket| bucket.available_at <= now && !bucket.subject_ids.is_empty())
}

pub async fn fetch_assignments_for_subjects(
    client: &Client,
    api_key: String,
    subject_ids: &[u64],
) -> Result<Vec<Assignment>, reqwest::Error> {
    let ids = subject_ids
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join(",");

    let url = format!(
        "https://api.wanikani.com/v2/assignments?subject_ids={}",
        ids
    );

    let res = client
        .get(&url)
        .wanikani_headers(api_key)
        .send()
        .await?
        .error_for_status()?
        .json::<CollectionResponse<Assignment>>()
        .await?;

    Ok(res.data)
}

pub async fn fetch_subjects(
    client: &Client,
    api_key: String,
    subject_ids: &[u64],
) -> Result<Vec<Subject>, String> {
    let ids = subject_ids
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join(",");

    let url = format!("https://api.wanikani.com/v2/subjects?ids={}", ids);

    let resp = client
        .get(&url)
        .wanikani_headers(api_key.clone())
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let txt = resp
        .text()
        .await
        .map_err(|e| format!("Error reading body as text: {}", e))?;

    // now try to deserialize:
    let wrapper: CollectionResponse<Subject> =
        serde_json::from_str(&txt).map_err(|e| format!("Serde error: {}", e))?;

    Ok(wrapper.data)
}

pub async fn submit_review(
    client: &Client,
    api_key: String,
    input: ReviewResult,
) -> Result<ReviewResponse, reqwest::Error> {
    let payload = ReviewPayload { review: input };

    let res = client
        .post("https://api.wanikani.com/v2/reviews")
        .wanikani_headers(api_key)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await?
        .error_for_status()?
        .json::<ReviewResponse>()
        .await?;

    Ok(res)
}
