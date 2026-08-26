<?php $c = file_get_contents("routes/web.php"); preg_match_all("/<<<<<<< HEAD.*?=======(.*?)>>>>>>> [a-f0-9]+/s", $c, $m); file_put_contents("temp_diff.txt", $m[0][0]); ?>
