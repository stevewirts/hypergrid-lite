var gulp         = require('gulp'),
		config = require('../config').vendorAssets;

gulp.task('copy-vendor-assets', function() {
    gulp.src(config)
    .pipe(gulp.dest('./build'));
});