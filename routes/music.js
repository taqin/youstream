var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  // stream(url).pipe(res);
  res.send('Musically');
});

module.exports = router;
