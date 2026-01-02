const gulp = require('gulp');
const rename = require('gulp-rename')
const { rm } = require('fs/promises');

gulp.task('lib', function () {
  gulp.src(['node_modules/marked-highlight/lib/index.cjs'])
    .pipe(rename('index.js'))
    .pipe(gulp.dest('js/marked-highlight'))

  gulp.src([
    'node_modules/katex/dist/katex.min.css'
  ]).pipe(gulp.dest('css'))

  gulp.src([
    'node_modules/katex/dist/fonts/*'
  ]).pipe(gulp.dest('css/fonts'))

  return gulp.src([
    'node_modules/jquery/dist/jquery.js',
    'node_modules/marked/marked.min.js',
    'node_modules/mermaid/dist/mermaid.min.js',
    'node_modules/katex/dist/katex.min.js'
  ]).pipe(gulp.dest('js'));
});

// Clean dist folder
gulp.task('clean', async function() {
  await rm('dist', { recursive: true, force: true });
});

// Build extension to dist folder
gulp.task('dist', gulp.series('clean', function() {
  // manifest.json
  gulp.src('manifest.json').pipe(gulp.dest('dist'));

  // HTML files
  gulp.src(['popup.html', 'options.html']).pipe(gulp.dest('dist'));

  // Root CSS
  gulp.src('bootstrap.css').pipe(gulp.dest('dist'));

  // JS files (all needed by manifest + popup + options)
  gulp.src([
    'js/katex.min.js',
    'js/config.js',
    'js/jquery.js',
    'js/marked.min.js',
    'js/purify.js',
    'js/highlight.min.js',
    'js/features.js',
    'js/markdownify.js',
    'js/underscore-min.js',
    'js/diagramflowseq.js',
    'js/mermaid.min.js',
    'js/platumlencode.js',
    'js/rawdeflate.js',
    'js/background.js',
    'js/popup.js',
    'js/options.js',
    'js/copyhtml.js',
    'js/copyraw.js'
  ]).pipe(gulp.dest('dist/js'));

  // marked-highlight
  gulp.src('js/marked-highlight/index.js').pipe(gulp.dest('dist/js/marked-highlight'));

  // CSS files
  gulp.src([
    'css/MarkdownTOC.css',
    'css/highlight.css',
    'css/katex.min.css'
  ]).pipe(gulp.dest('dist/css'));

  // KaTeX fonts
  gulp.src('css/fonts/*').pipe(gulp.dest('dist/css/fonts'));

  // Theme files
  gulp.src('theme/*.css').pipe(gulp.dest('dist/theme'));
  gulp.src('theme/i/*.png').pipe(gulp.dest('dist/theme/i'));

  // Icon
  return gulp.src('images/icon.png').pipe(gulp.dest('dist/images'));
}));

