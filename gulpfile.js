const gulp = require('gulp');
const gulpRename = require('gulp-rename');
const uglifyJS = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const pipeline = require('readable-stream').pipeline;

gulp.task('build_js', function () {
  return pipeline(
    gulp.src('src/orient.js'),
    gulpRename('orient.min.js'),
    uglifyJS({
      compress: {
        drop_console: true
      }
    }),
    gulp.dest('dist')
  );
});

gulp.task('build_devjs', function () {
  return pipeline(
    gulp.src('src/orient.js'),
    gulp.dest('dist')
  );
});

gulp.task('build_css', function () {
  return pipeline(
    gulp.src('src/*.css'),
    gulpRename((path) => {
      path.basename += '.min'
    }),
    cleanCSS(),
    gulp.dest('dist')
  );
});

gulp.task('build_devcss', function () {
  return pipeline(
    gulp.src('src/*.css'),
    gulp.dest('dist')
  );
});

gulp.task('watch', function () {
  gulp.watch('src/orient.js', gulp.parallel('build_js', 'build_devjs'));
  gulp.watch('src/*.css', gulp.parallel('build_css', 'build_devcss'));
});

gulp.task('build', gulp.parallel('build_js', 'build_devjs', 'build_css', 'build_devcss'));