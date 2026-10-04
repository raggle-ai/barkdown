# Media preview examples

Images and videos start collapsed as small thumbnail + title rows.
Click to expand; click again to collapse. Collapsing a video stops
playback, and expanding it resumes with autoplay.

## Local Glimpse demo

Served via Vite's `/@fs/` path when previewing locally — these paths
are not portable web URLs.

<video title="Glimpse — local demo" controls preload="metadata" playsinline width="800" poster="/@fs/Users/andrew/Downloads/barkdown-media-test/glimpse-poster.jpg" src="/@fs/Users/andrew/Documents/GitHub/glimpse/assets/demo.mp4"></video>

## Big Buck Bunny — poster

![Big Buck Bunny — Blender Foundation poster](https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg)

## Big Buck Bunny — short clip

<video title="Big Buck Bunny — 10 seconds, 720p" controls preload="metadata" playsinline width="800" poster="https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg" src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4"></video>

## Big Buck Bunny — source element, no poster

<video title="Big Buck Bunny — 1080p, source element" controls preload="metadata" playsinline width="800">
  <source src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4" type="video/mp4">
</video>

## Big Buck Bunny — full movie

<video title="Big Buck Bunny — full movie, Internet Archive" controls preload="metadata" playsinline width="800" poster="https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg" src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"></video>

Big Buck Bunny © Blender Foundation,
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
[Project website](https://peach.blender.org/). External media requires
internet access and host availability.
