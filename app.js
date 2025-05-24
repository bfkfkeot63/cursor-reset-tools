import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import resetRouter from './routes/reset.js';

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.use('/api', resetRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 