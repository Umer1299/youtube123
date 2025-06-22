import express from 'express';
import axios from 'axios';
import morgan from 'morgan';
import { config } from 'dotenv';

config();
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

/** Optional HEAD request for file size */
const getContentLength = async (url) => {
  try {
    const { headers } = await axios.head(url);
    return headers['content-length'];
  } catch {
    return undefined;
  }
};

app.post('/upload', async (req, res) => {
  const { video_url, youtube_upload_url } = req.body;

  if (!video_url || !youtube_upload_url) {
    return res.status(400).json({ error: 'Missing video_url or youtube_upload_url' });
  }

  try {
    const videoStream = await axios.get(video_url, { responseType: 'stream' });
    const fileSize = await getContentLength(video_url);

    const ytResp = await axios.put(youtube_upload_url, videoStream.data, {
      headers: {
        'Content-Type': 'video/mp4',
        ...(fileSize && { 'Content-Length': fileSize }),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });

    if (ytResp.status >= 200 && ytResp.status < 300) {
      return res.json({ status: 'success', youtube_response: ytResp.data });
    } else {
      return res.status(ytResp.status).json({
        status: 'error',
        youtube_response: ytResp.data,
      });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Uploader running on http://localhost:3000');
});
