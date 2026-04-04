$f = 'E:\2026\AI开发\食安答题助手\Kimi_Agent_食安助手文档\app\src\App.tsx'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$c = $c -replace '<CardDescription>请上传缴费凭证图片</CardDescription>', ''
$c = $c -replace 'max=\{60\}\n\s*/>', "max={60}`n              className=`"mt-2`"`n            />"
$c = $c -replace '<Label>缴费凭证</Label>', '<Label>缴费凭证：请上传微信转账凭证截图（须备注用户注册手机号）</Label>'
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Output 'Done'
