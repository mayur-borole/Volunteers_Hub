$ErrorActionPreference = 'Stop'
$base='http://localhost:5000/api'
$volLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"vol@test1.com","password":"Test1234"}'
$volToken = $volLogin.accessToken
$orgLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"org123@example.com","password":"Test1234"}'
$orgToken = $orgLogin.accessToken
$events = Invoke-RestMethod -Uri "$base/events/my-events" -Method Get -Headers @{Authorization="Bearer $orgToken"}
$eventId = $events.events[0]._id

try {
  Invoke-RestMethod -Uri "$base/events/$eventId/register" -Method Post -ContentType 'application/json' -Headers @{Authorization="Bearer $volToken"} -Body '{"note":"test registration"}' | Out-Null
} catch {}

try {
  $res = Invoke-RestMethod -Uri "$base/events/$eventId/cancel" -Method Post -ContentType 'application/json' -Headers @{Authorization="Bearer $volToken"} -Body '{"reason":"Not interested anymore"}'
  Write-Host "CANCEL_SUCCESS:"
  $res | ConvertTo-Json
} catch {
  Write-Host "CANCEL_FAIL:"
  $_
}
