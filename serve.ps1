# Lance CoproVente sur cet ordinateur (Windows, sans installation).
# Le plus simple : double-cliquez sur « Lancer CoproVente.bat ».
# L'application s'ouvre sur http://localhost:8080 (adresse nécessaire à la connexion Gmail).
param([int]$Port = 8080)
$url = "http://localhost:$Port/"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try { $listener.Start() } catch {
  # Déjà lancée (ou port occupé) : on ouvre simplement le navigateur
  Start-Process $url
  exit
}
Write-Host ""
Write-Host "  CoproVente est lancée : $url"
Write-Host "  Laissez cette fenêtre ouverte pendant l'utilisation. Fermez-la pour arrêter."
Write-Host ""
Start-Process $url
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.svg'='image/svg+xml'; '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.ico'='image/x-icon'; '.md'='text/plain; charset=utf-8' }
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path))
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
        $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else { $ctx.Response.StatusCode = 404 }
    } catch { } finally { $ctx.Response.Close() }
  }
} finally { $listener.Stop() }
