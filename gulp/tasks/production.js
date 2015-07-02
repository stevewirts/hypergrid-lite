var gulp = require('gulp');

// Run this to compress all the things!
//gulp.task('production', ['karma'], function(){
gulp.task('production', ['copy-vendor-assets'], function(){
  // This runs only if the karma tests pass
  gulp.start(['markup', 'images', 'iconFont', 'minifyCss', 'uglifyJs'])
});
