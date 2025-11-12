// translate.js
import fs from 'fs';
import { translate } from '@vitalets/google-translate-api'; // ✅ SỬA DÒNG NÀY

const enFile = './src/i18n/locales/en.json';
const viFile = './src/i18n/locales/vi.json';

const translateObject = async (obj) => {
    const result = {};
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            result[key] = await translateObject(obj[key]);
        } else {
            try {
                const res = await translate(obj[key], { from: 'en', to: 'vi' });
                result[key] = res.text;
                console.log(`✅ ${obj[key]} → ${res.text}`);
            } catch (err) {
                console.error(`❌ Lỗi dịch key: ${key}`, err.message);
                result[key] = obj[key];
            }
        }
    }
    return result;
};

const main = async () => {
    console.log('🌍 Đang dịch file en.json → vi.json ...');
    const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    const translated = await translateObject(enData);
    fs.writeFileSync(viFile, JSON.stringify(translated, null, 2), 'utf8');
    console.log('✨ Hoàn tất! File vi.json đã được cập nhật.');
};

main();
