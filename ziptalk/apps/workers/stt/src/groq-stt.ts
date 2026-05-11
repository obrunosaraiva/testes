import Groq from "groq-sdk";

export interface TranscribeOptions {
  audioBuffer: Buffer;
  mimeType: string;
  /** Hint do idioma (ISO 639-1). Se omitido, Whisper detecta. */
  language?: string;
}

export interface TranscribeResult {
  text: string;
  language: string;
  durationSeconds: number;
}

export class GroqSTT {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async transcribe(opts: TranscribeOptions): Promise<TranscribeResult> {
    const filename = this.guessFilename(opts.mimeType);
    const file = new File([opts.audioBuffer], filename, { type: opts.mimeType });

    const res = await this.client.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: opts.language,
      response_format: "verbose_json",
      temperature: 0,
    });

    // verbose_json retorna { text, language, duration, segments }
    // tipos da SDK do Groq não expõem todos os campos, então casting controlado
    const verbose = res as unknown as {
      text: string;
      language: string;
      duration: number;
    };

    return {
      text: verbose.text.trim(),
      language: verbose.language,
      durationSeconds: Math.round(verbose.duration),
    };
  }

  private guessFilename(mimeType: string): string {
    if (mimeType.includes("ogg")) return "audio.ogg";
    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "audio.mp3";
    if (mimeType.includes("wav")) return "audio.wav";
    if (mimeType.includes("m4a") || mimeType.includes("mp4")) return "audio.m4a";
    return "audio.bin";
  }
}
