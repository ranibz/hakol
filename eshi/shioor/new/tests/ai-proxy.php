<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$body = file_get_contents('php://input');
$data = json_decode($body, true);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: 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',
        'anthropic-version: 2023-06-01'
    ]
]);

$response = curl_exec($ch);
curl_close($ch);
echo $response;
