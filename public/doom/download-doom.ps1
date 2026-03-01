# Download DOOM WebAssembly files from webDOOM project
Write-Host "Downloading DOOM files..." -ForegroundColor Green

$baseUrl = "https://ustymukhman.github.io/webDOOM/public/"
$files = @(
    "doom1.js",
    "doom1.data",
    "doom1.wasm",
    "index.html",
    "index.css"
)

foreach ($file in $files) {
    $url = $baseUrl + $file
    Write-Host "Downloading $file..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing
        Write-Host "✓ Downloaded $file" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to download $file" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host "DOOM files download complete!" -ForegroundColor Green 