use uuid::Uuid;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

pub async fn download_and_save_image(
    url: &str,
    storage_path: &str,
    client: &reqwest::Client,
) -> Result<String, String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download image: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;

    // Determine extension from URL or default to png
    let extension = if url.contains(".webp") {
        "webp"
    } else if url.contains(".jpg") || url.contains(".jpeg") {
        "jpg"
    } else {
        "png"
    };

    let filename = format!("{}.{}", Uuid::new_v4(), extension);
    let path = Path::new(storage_path).join(&filename);

    let mut file = File::create(path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(&bytes)
        .await
        .map_err(|e| format!("Failed to write to file: {}", e))?;

    Ok(filename)
}
