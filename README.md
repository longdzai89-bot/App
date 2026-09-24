# Mic Boost — Android APK

Ứng dụng điều khiển microphone gồm:
- Mic gain: -12 đến +24 dB
- Noise gate
- Compressor
- Voice level meter
- Monitor microphone trong app
- Capacitor + GitHub Actions build APK

## Giới hạn quan trọng

APK Android thông thường không thể tự ý thay đổi microphone input của một ứng dụng khác như Discord. Vì vậy source này không giả vờ rằng nó có thể "chèn mic boost" trực tiếp vào Discord.

DSP trong source chỉ áp dụng cho audio pipeline của chính app. Nếu mục tiêu là đưa audio đã xử lý vào Discord, cần một audio routing/driver/thiết bị được Android và Discord hỗ trợ.

## Build bằng Termux

```bash
pkg update -y
pkg install git nodejs-lts unzip -y

cd ~
unzip mic-boost-discord-ready.zip
cd mic-boost-discord-ready

npm install
npm run build:web

git init
git branch -M main
git add .
git commit -m "Initial Mic Boost app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

GitHub Actions sẽ build APK tại:
Actions -> Build APK -> run thành công -> Artifacts -> mic-boost-debug.

## Chạy web test

```bash
npm run build:web
```

## Giao diện

Thiết kế cố ý theo kiểu utility/audio control app: nền tối, panel phẳng, typography nhỏ, không chatbot, không gradient AI, không "AI assistant" UI.
