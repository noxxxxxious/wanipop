use serde::{Deserialize, Serialize};
use std::io::{self, Write};
use std::{fs, path::PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WanipopConfig {
    pub num_of_reviews_per_batch: usize,
    pub time_between_popups_in_minutes: usize,
    pub wanikani_api_key: Option<String>,

    pub hide_window_decorations: bool,
}

impl Default for WanipopConfig {
    fn default() -> Self {
        WanipopConfig::new(5, 60, None, false)
    }
}

impl WanipopConfig {
    pub fn new(
        num_of_reviews_per_batch: usize,
        time_between_popups_in_minutes: usize,
        wanikani_api_key: Option<String>,
        hide_window_decorations: bool,
    ) -> WanipopConfig {
        WanipopConfig {
            num_of_reviews_per_batch,
            time_between_popups_in_minutes,
            wanikani_api_key,
            hide_window_decorations,
        }
    }

    pub fn config_path() -> PathBuf {
        let config_dir = dirs::config_dir().expect("Could not find config directory");
        config_dir.join("wanipop").join("config.json")
    }

    pub fn load_or_create() -> io::Result<Self> {
        let path = Self::config_path();

        if path.exists() {
            let data = fs::read_to_string(&path)?;
            let config: WanipopConfig = serde_json::from_str(&data)?;
            Ok(config)
        } else {
            let config = WanipopConfig::default();
            config.save()?;
            Ok(config)
        }
    }

    pub fn save(&self) -> io::Result<()> {
        let path = Self::config_path();

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let json = serde_json::to_string_pretty(self)?;
        let mut file = fs::File::create(path)?;
        file.write_all(json.as_bytes())?;
        Ok(())
    }

    pub fn set_api_key(&mut self, key: String) -> io::Result<()> {
        self.wanikani_api_key = Some(key);
        self.save()
    }

    pub fn set_num_of_reviews_per_batch(
        &mut self,
        new_num_of_reviews_per_batch: usize,
    ) -> io::Result<()> {
        self.num_of_reviews_per_batch = new_num_of_reviews_per_batch;
        self.save()
    }

    pub fn set_time_between_popups_in_minutes(
        &mut self,
        new_time_between_popups_in_minutes: usize,
    ) -> io::Result<()> {
        self.time_between_popups_in_minutes = new_time_between_popups_in_minutes;
        self.save()
    }

    pub fn set_hide_window_decorations(
        &mut self,
        new_hide_window_decorations: bool,
    ) -> io::Result<()> {
        self.hide_window_decorations = new_hide_window_decorations;
        self.save()
    }
}
