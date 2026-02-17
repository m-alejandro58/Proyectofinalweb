
Add-Type -AssemblyName System.Drawing
$path = 'C:\Users\maiko\.gemini\antigravity\brain\9b11b968-9704-4ec2-9999-d76d1d441492\uploaded_media_0_1770216165571.png'
try {
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    $counts = @{}
    
    # Sample center area
    $centerX = [int]($bmp.Width / 2)
    $centerY = [int]($bmp.Height / 2)
    
    for($x = 0; $x -lt $bmp.Width; $x += 5) {
        for($y = 0; $y -lt $bmp.Height; $y += 5) {
             $p = $bmp.GetPixel($x, $y)
             # Filter white/transparent/black
             if ($p.A -eq 0) { continue }
             if ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240) { continue } # Skip White
             if ($p.R -lt 20 -and $p.G -lt 20 -and $p.B -lt 20) { continue } # Skip Black
             
             $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
             if ($counts.ContainsKey($hex)) { $counts[$hex]++ }
             else { $counts[$hex] = 1 }
        }
    }
    
    if ($counts.Count -gt 0) {
        $sorted = $counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1
        Write-Output $sorted.Key
    } else {
        Write-Output "NoColor"
    }
    $bmp.Dispose()
} catch {
    Write-Output "Error: $_"
}
