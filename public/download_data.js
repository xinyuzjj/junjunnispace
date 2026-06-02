const https = require('https');
const fs = require('fs');
const path = require('path');

const BINANCE_API = 'api.binance.com';
const SYMBOL = 'ETHUSDT';
const LIMIT_PER_REQUEST = 1000;
const BATCH_DELAY = 300;

const INTERVAL_MAP = {
    '1m': { seconds: 60, binance: '1m' },
    '3m': { seconds: 180, binance: '3m' },
    '5m': { seconds: 300, binance: '5m' },
    '15m': { seconds: 900, binance: '15m' },
    '30m': { seconds: 1800, binance: '30m' },
    '1h': { seconds: 3600, binance: '1h' },
    '4h': { seconds: 14400, binance: '4h' },
    '1d': { seconds: 86400, binance: '1d' },
    '1w': { seconds: 604800, binance: '1w' },
    '1M': { seconds: 2592000, binance: '1M' }
};

const EARLIEST_ETH_TIMESTAMP = new Date('2015-08-07T00:00:00Z').getTime();

function fetchKlinesBatch(interval, startTime, endTime) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            symbol: SYMBOL,
            interval: INTERVAL_MAP[interval].binance,
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            limit: LIMIT_PER_REQUEST.toString()
        });

        const options = {
            hostname: BINANCE_API,
            path: `/api/v3/klines?${params}`,
            method: 'GET',
            headers: {
                'User-Agent': 'ETH-Trading-Chart/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(jsonData)}`));
                    }
                } catch (error) {
                    reject(new Error(`解析JSON失败: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

function parseKlineData(data) {
    return data.map(item => ({
        time: Math.floor(parseInt(item[0]) / 1000),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
    }));
}

function mergeAndDeduplicateData(allBatchesData) {
    const timeMap = new Map();
    
    for (const candle of allBatchesData) {
        if (!timeMap.has(candle.time)) {
            timeMap.set(candle.time, candle);
        }
    }
    
    const mergedData = Array.from(timeMap.values());
    mergedData.sort((a, b) => a.time - b.time);
    
    return mergedData;
}

async function downloadIntervalData(interval) {
    console.log(`开始下载 ${interval} 数据...`);
    
    try {
        const intervalSeconds = INTERVAL_MAP[interval].seconds;
        const now = Date.now();
        const batchSize = intervalSeconds * 1000 * LIMIT_PER_REQUEST;
        const batches = [];
        let currentEndTime = now;

        while (currentEndTime > EARLIEST_ETH_TIMESTAMP) {
            const currentStartTime = Math.max(currentEndTime - batchSize, EARLIEST_ETH_TIMESTAMP);
            batches.push({ startTime: currentStartTime, endTime: currentEndTime });
            currentEndTime = currentStartTime - 1;
        }

        const allBatchesData = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`下载批次 ${i + 1}/${batches.length}...`);
            
            try {
                const data = await fetchKlinesBatch(interval, batch.startTime, batch.endTime);
                if (data.length > 0) {
                    allBatchesData.push(...parseKlineData(data));
                }
                if (data.length === LIMIT_PER_REQUEST && i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            } catch (error) {
                console.warn(`批次 ${i + 1} 下载失败:`, error.message);
                break;
            }
        }

        if (allBatchesData.length > 0) {
            const mergedData = mergeAndDeduplicateData(allBatchesData);
            const outputDir = path.join(__dirname, 'data');
            
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const outputPath = path.join(outputDir, `${interval}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2));
            
            console.log(`✅ ${interval} 数据下载完成，共 ${mergedData.length.toLocaleString()} 根K线`);
            console.log(`文件已保存到: ${outputPath}`);
            
            return mergedData.length;
        } else {
            console.log(`❌ ${interval} 没有获取到数据`);
            return 0;
        }

    } catch (error) {
        console.error(`下载 ${interval} 数据失败:`, error.message);
        return 0;
    }
}

async function downloadAllData() {
    console.log('========================================');
    console.log('开始下载ETH/USDT历史K线数据');
    console.log('========================================\n');

    const intervals = ['15m', '1h', '4h', '1d', '3m', '5m', '1M'];
    let totalCount = 0;

    for (const interval of intervals) {
        const count = await downloadIntervalData(interval);
        totalCount += count;
        console.log('');
    }

    console.log('========================================');
    console.log(`全部下载完成！共 ${totalCount.toLocaleString()} 根K线`);
    console.log('========================================');
}

downloadAllData();