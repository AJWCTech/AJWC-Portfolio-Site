<?php
/**
 * contact.php — Archie Cook Portfolio
 * Handles contact form submissions from index.html and Contact.html.
 * Secured: honeypot, rate limiting, sanitisation,
 * header injection prevention, spam filtering.
 */

// ── Session cookie hardening — set BEFORE session_start ─────────────────────
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,       // not readable from JavaScript
    'samesite' => 'Lax',      // not sent on cross-site POSTs
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);
session_start();

// ── Config ──────────────────────────────────────────────────────────────────
define('TO_EMAIL',        'archiecook7878@gmail.com');
define('FROM_DOMAIN',     'ajwctechconsulting.com');
define('RATE_LIMIT',      3);          // max submissions per window
define('RATE_WINDOW',     600);        // 10-minute window
define('MAX_NAME_LEN',    80);
define('MAX_SUBJECT_LEN', 120);
define('MAX_MSG_LEN',     3000);

// ── Redirect helper ──────────────────────────────────────────────────────────
function redirect(string $status): void {
    header('Location: Contact.html?status=' . rawurlencode($status));
    exit;
}

// ── Only accept POST ─────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: Contact.html');
    exit;
}

// ── Same-origin check — rejects form posts made from other websites ─────────
// Origin (or Referer as fallback) must match the host serving this script.
// If a privacy setup strips both headers, the post is allowed through — the
// check blocks mismatches, it does not punish their absence.
$expected_host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $h) {
    if (empty($_SERVER[$h])) {
        continue;
    }
    $got_host = strtolower((string) parse_url($_SERVER[$h], PHP_URL_HOST));
    if ($expected_host !== '' && $got_host !== '' && $got_host !== $expected_host) {
        redirect('error');
    }
    break; // only the most trustworthy header present needs checking
}

// ── Honeypot — bots fill hidden fields, humans don't ────────────────────────
if (!empty($_POST['website']) || !empty($_POST['company_url'])) {
    redirect('success'); // silent — don't reveal to bots
}

$now = time();

// ── Rate limiting, layer 1: per-IP, file-backed ─────────────────────────────
// Survives the client clearing cookies. The IP is hashed so raw addresses
// are not written into temp-file names.
$rl_file = sys_get_temp_dir() . '/ajwc_rl_'
         . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . FROM_DOMAIN);
$ip_times = [];
if (is_file($rl_file)) {
    $decoded  = json_decode((string) @file_get_contents($rl_file), true);
    $ip_times = array_values(array_filter(
        is_array($decoded) ? array_map('intval', $decoded) : [],
        fn($t) => ($now - $t) < RATE_WINDOW
    ));
}
if (count($ip_times) >= RATE_LIMIT) {
    redirect('error');
}
$ip_times[] = $now;
@file_put_contents($rl_file, json_encode($ip_times), LOCK_EX);

// ── Rate limiting, layer 2: session-based (kept as belt-and-braces) ─────────
if (!isset($_SESSION['submit_times']) || !is_array($_SESSION['submit_times'])) {
    $_SESSION['submit_times'] = [];
}
$_SESSION['submit_times'] = array_filter(
    $_SESSION['submit_times'],
    fn($t) => ($now - $t) < RATE_WINDOW
);
if (count($_SESSION['submit_times']) >= RATE_LIMIT) {
    redirect('error');
}
$_SESSION['submit_times'][] = $now;

// ── Sanitise inputs ───────────────────────────────────────────────────────────
function clean(string $value, int $maxLen): string {
    $value = trim($value);
    $value = strip_tags($value);
    $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    $value = preg_replace('/[\r\n\t]+/', ' ', $value); // strip newlines — prevents header injection
    return mb_substr($value, 0, $maxLen);
}

$name    = clean($_POST['name']    ?? '', MAX_NAME_LEN);
$email   = trim($_POST['email']    ?? '');
$subject = clean($_POST['subject'] ?? '', MAX_SUBJECT_LEN);
$message = clean($_POST['message'] ?? '', MAX_MSG_LEN);

// ── Required field check ──────────────────────────────────────────────────────
if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    redirect('error');
}

// ── Email validation ──────────────────────────────────────────────────────────
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    redirect('error');
}
// Block disposable email domains
$blocked_domains = [
    'mailinator.com', 'guerrillamail.com', 'trashmail.com',
    '10minutemail.com', 'tempmail.com', 'throwam.com', 'yopmail.com',
];
$email_domain = strtolower(substr(strrchr($email, '@'), 1));
if (in_array($email_domain, $blocked_domains, true)) {
    redirect('error');
}

// ── Name must contain at least one letter ─────────────────────────────────────
if (!preg_match('/[a-zA-Z]/', $name)) {
    redirect('error');
}

// ── Spam keyword filter ───────────────────────────────────────────────────────
$spam_patterns = [
    '/\b(viagra|cialis|casino|poker|lottery|bitcoin|crypto|forex|loan offer|make money fast)\b/i',
    '/\b(click here|buy now|free money|earn \$\d+|winner|you have been selected)\b/i',
    '/https?:\/\/[^\s]{3,}/i',  // URLs in message body
    '/\[url=/i',                 // BBCode links
    '/<a\s/i',                   // HTML anchor tags
];
foreach ($spam_patterns as $pattern) {
    if (preg_match($pattern, $message) || preg_match($pattern, $subject)) {
        redirect('error');
    }
}

// ── Build email (all values sanitised — no header injection possible) ────────
$safe_name  = preg_replace('/[^a-zA-Z0-9 \-\.]/', '', $name);
$safe_email = filter_var($email, FILTER_SANITIZE_EMAIL);

$email_subject = '[Portfolio Contact] ' . $subject . ' — from ' . $safe_name;

$email_body  = "New message from the archiecook portfolio contact page.\n";
$email_body .= str_repeat('─', 50) . "\n\n";
$email_body .= "Name:    " . $name    . "\n";
$email_body .= "Email:   " . $email   . "\n";
$email_body .= "Subject: " . $subject . "\n";
$email_body .= "IP:      " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n\n";
$email_body .= str_repeat('─', 50) . "\n";
$email_body .= "Message:\n\n" . $message . "\n\n";
$email_body .= str_repeat('─', 50) . "\n";
$email_body .= "Reply directly to this email to respond to " . $safe_name . ".\n";

// ── Safe headers ──────────────────────────────────────────────────────────────
$headers  = "From: noreply@" . FROM_DOMAIN . "\r\n";
$headers .= "Reply-To: " . $safe_name . " <" . $safe_email . ">\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Spam-Source: contact-form\r\n";

// ── Send ──────────────────────────────────────────────────────────────────────
if (mail(TO_EMAIL, $email_subject, $email_body, $headers)) {
    redirect('success');
} else {
    redirect('error');
}
