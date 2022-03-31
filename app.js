const fs = require("fs");
const path = require("path");

const express = require("express");

const app = express();
app.use(express.json());

const port = 3333;

app.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const basedir = path.resolve(__dirname);
  const mediapath = path.resolve(basedir, 'static', filename);

  fs.stat(mediapath, (err, stats) => {
    // Media file not found out couldn't open it...
    function obtainMimetype(filename) {
      const mimetypes = {
        image: [
          'jpg',
          'jpeg',
          'jfif',
          'pjpeg',
          'pjp',
          'png', 
          'gif',
          'svg', 
        ],
        video: [
          'mp4',
          'mov',
          'avi',
          'mp2',
          'mpeg'
        ]
      };

      const index = filename.indexOf('.');

      if (index === -1) {
        return {
          mimetype: null,
          valid: false,
          error: 'No file extensions found...'
        };
      }

      const type = filename.substring(index + 1);

      if (mimetypes.image.includes(type)) {
        return {
          mimetype: `image/${type}`,
          valid: true,
          error: null
        }
      } else if (mimetypes.video.includes(type)) {
        return {
          mimetype: `video/${type}`,
          valid: true,
          error: null
        }
      } else {
        return {
          mimetype: null,
          valid: false,
          error: 'Invalid mimetype'
        }
      }
    }

    if (err) {
      console.log(err);
      return res.status(404).json({
        message: 'Movie not found!'
      });
    }

    // Obtaining range and file stats
    const { range='0' } = req.headers;
    const { size } = stats;

    const start = Number(range.replace(/bytes=/, '').split('-')[0]);
    const chunkSize = 2 ** 20;
    const end = Math.min(start + chunkSize, size - 1);
    const contentLength = end - start + 1;

    const { mimetype, valid, error } = obtainMimetype(filename);

    if (!valid) {
      return res.status(400).json({
        message: error
      });
    }

    // Definindo headers de chunk...
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': `bytes`,
      'Content-Length': contentLength,
      'Content-Type': mimetype
    };

    res.writeHead(206, headers);

    const stream = fs.createReadStream(mediapath, { start, end });

    stream.on('open', () => stream.pipe(res));
    stream.on('end', () => stream.close());
    stream.on('error', error => res.status(500).json({ message: error.message }));
  });

  return;
});

app.listen(port, () => {
  console.log('================================');
  console.log('🎥 Server running at port 3000');
  console.log('================================');
});