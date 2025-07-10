import express from "express";
import clipboard from "clipboardy";
import { z } from "zod";
import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

