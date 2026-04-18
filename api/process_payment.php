<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    echo json_encode(["success" => false, "error" => "Invalid input"]);
    exit;
}

$client_id = 'z1r0_7988d1c4';
$client_secret = 'a2f61e17-2a5f-4277-9ea0-e53835f6ccec';
$account_email = 'vendas@amazon.es'; // Replace with real account email if known

$create_url = 'https://api.waymb.com/transactions/create';

$payload = [
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'account_email' => $account_email,
    'amount' => (float)$input['amount'],
    'method' => $input['method'], // mbway or multibanco
    'payer' => [
        'email' => $input['payer']['email'] ?? 'pagador@exemplo.pt',
        'name' => $input['payer']['name'],
        'document' => $input['payer']['document'], // NIF
        'phone' => $input['payer']['phone']
    ],
    'currency' => 'EUR'
];

$ch = curl_init($create_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json'
]);

$response_raw = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response_raw, true);

if ($http_code !== 200) {
    http_response_code($http_code === 0 ? 500 : $http_code);
    echo json_encode([
        "success" => false, 
        "error" => "Falha ao criar transação", 
        "details" => $data
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "data" => $data
]);
?>
