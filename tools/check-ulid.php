<?php
require 'E:\Projetos\LOPES FOCUS\wp-api\gestor-api\vendor\autoload.php';
use Ulid\Ulid;
$ids = ['01AREAT1', '01AREAP1', '01AREAD1', '01TASK3AZGDQ190K', '01DEMOO6R0TO5TO6', '01M0HEPTNP0MP1EFJSPHVERSM9', '01M0HEPTNP0MP1EFJSPHVERSM8'];
foreach ($ids as $u) {
    echo $u, ' => ', (Ulid::is_valid($u) ? 'VALID' : 'INVALID'), "\n";
}
