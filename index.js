const fetch = require('node-fetch');
const {sleep} =  require('./helper/time');
const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(tokenTelegram, {polling: true});
require('dotenv').config()
const token = process.env.TOKEN
const tokenTelegram = process.env.TOKEN_TELEGRAM

console.log(token)
let addrs = []

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
        let Action // msg.event === "Created"

        if (result.seller.address.toLowerCase() === address.toLowerCase()) {
            Action = "sale"
        } else {
            Action = "bought"
        }
        let message = "One investor " + Action + " " + msg.quantity + " " + msg.slug + msg.price + "\nLink: https://opensea.io/collection/" + msg.slug + " addrs = :" + address
        console.log("sended")
        await bot.sendMessage(id, message);
    }catch (e) {
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
                    price: /*result.asset_events[i].total_price / (10 ** 18) ?*/ " for " + result.asset_events[i].total_price / (10 ** 18) + 'eth' /*: '' */}
                    , id) //: 0
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
               try {
                    let res = await fetch("https://api.opensea.io/api/v1/events?account_address=" + addrs[i].addrs + "&event_type=successful" , {
                        headers: {
                            Accept: "application/json",
                            "X-Api-Key": token
                        }
                    })
                     result = await res.json();
                    if (res.status !== 200) {
                        await sleep(2000);
                        if (Error === 4) {
                            Error = 0;
                        } else {
                            Error++;
                            i--;
                        }
                        await sleep(4000 + Error * 1500);
                    } else if (!addrs[i].lastCheck) {
                        console.log(i,"%", addrs[i].addrs)
                        Error = 0;
                        addrs[i].lastCheck = result.asset_events[0];
                    } else if (result.asset_events[0].asset.id !== addrs[i].lastCheck.asset.id ) { // addrs[i].lastCheck.transaction.transaction_hash !== result.asset_events[0].transaction.transaction_hash) {
                        Error = 0;
                        await initMessage(result, addrs[i].lastCheck, addrs[i].addrs, id);
                        addrs[i].lastCheck = result.asset_events[0];
                    }
                    await sleep(2500);

               } catch (e) {
                   await sleep(2500);
                    console.log("Error", e)
                    }
                }
                i = 0;
            }
}


bot.onText(/\/start/,  (msg) => {
        script(msg.chat.id);
});
