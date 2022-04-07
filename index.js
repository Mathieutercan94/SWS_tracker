const fetch = require('node-fetch');
const {sleep} =  require('./helper/time');
const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config()
const token = process.env.TOKEN
const tokenTelegram = process.env.TOKEN_TELEGRAM
const bot = new TelegramBot(tokenTelegram, {polling: true});

let addrs = []
let start = false;

async function init() {
    const data = fs.readFileSync('./Adresse',
        {encoding:'utf8', flag:'r'});
        const words = data.split('\n');
        for (let i = 0; words[i]; i++) {
            addrs.push({"addrs": words[i]})
        }
}

async function sendMessage(result, address ,msg, id ) {
    try {
        let Action;
        // if (result.seller.address.toLowerCase() === address.toLowerCase()) {
        //     Action = "sale"
        // } else {
        //     Action = "bought"
        // }
        result.seller.address.toLowerCase() === address.toLowerCase() ? Action = 'sale' : Action = 'bought'
        let href = "'https://opensea.io/collection/" + msg.slug + "'"
        let link = "<a href=" + href + ">" + msg.slug + "</a>"
        let message = "One investor " + Action + " " + msg.quantity + " "+ link +  msg.price + "\n addrs  :" + address
        await bot.sendMessage(id, message, {parse_mode: 'HTML'});

    } catch (e) {
        console.log("Error send message: ", e)
    }
}

async function initMessage(result,  initial, address, id) {
    try {
        for (let i = 0; result.asset_events[i]  && result.asset_events[i].asset.id !== initial.asset.id; i++ ) {
            await sendMessage(result.asset_events[i], address, {
                    date: new Date(),
                    event: result.asset_events[i].event_type,
                    slug: result.asset_events[i].collection_slug,
                    payement_token: result.asset_events[i].payment_token,
                    quantity: result.asset_events[i].quantity,
                    price: " for " + result.asset_events[i].total_price / (10 ** 18) + 'eth',
                    time: result.asset_events[i].timestamp
                }, id)
        }
    } catch (e) {
        console.log('Error initMess age', e)
    }
}

async function script(id) {
    await init();
    let Error = 0;
    let result;
    let i = 0;

        while(1) {
            for (; addrs[i]; i++) {
                // console.log(i)
                await sleep(1000);
                try {
                    let res = await fetch("https://api.opensea.io/api/v1/events?account_address=" + addrs[i].addrs + "&event_type=successful" , {
                        headers: {
                            Accept: "application/json",
                            "X-Api-Key": token
                        }
                    })
                     result = await res.json();

                    if (res.status !== 200) {
                        console.log("Error: ", Error, " ", result, "\n")
                        Error++;
                        i--;
                        await sleep(2000 + Error * 1000);

                    } else if (!addrs[i].lastCheck) {
                        console.log(i,"%", addrs[i].addrs, "time = ", new Date())
                        Error = 0;
                        addrs[i].lastCheck = result.asset_events[0];

                    } else if (result.asset_events[0].asset.id !== addrs[i].lastCheck.asset.id ) {
                        Error = 0;
                        await initMessage(result, addrs[i].lastCheck, addrs[i].addrs, id);
                        addrs[i].lastCheck = result.asset_events[0];

                    } else {
                        Error = 0;
                    }
               } catch (e) {
                    console.log("Error", e)
                    }
                }
                i = 0;
            }
}

bot.onText(/\/start/,   (msg) => {
    if (start === false) {
        script(msg.chat.id);
        start = true
    }
});
