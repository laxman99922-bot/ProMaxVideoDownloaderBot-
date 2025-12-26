import os
import yt_dlp
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"

DOWNLOAD_PATH = "downloads"
os.makedirs(DOWNLOAD_PATH, exist_ok=True)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome!\n\n"
        "🎥 Send any video link (YouTube, Insta, FB, etc)\n"
        "⚡ I will download & send it to you."
    )

async def download_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    msg = await update.message.reply_text("⏳ Downloading... Please wait")

    ydl_opts = {
        'outtmpl': f'{DOWNLOAD_PATH}/%(title)s.%(ext)s',
        'format': 'best',
        'quiet': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            file_name = ydl.prepare_filename(info)

        await update.message.reply_video(
            video=open(file_name, 'rb'),
            caption="✅ Downloaded Successfully!"
        )

        os.remove(file_name)
        await msg.delete()

    except Exception as e:
        await msg.edit_text("❌ Failed to download video.\nTry another link.")

def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, download_video))

    print("Bot Running...")
    app.run_polling()

if __name__ == "__main__":
    main()
