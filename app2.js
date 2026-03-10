
var cors = require('cors');
var express = require('express');
var mysql = require('mysql');
var request = require('request-promise');
var conf = require('./config/conf');
var TelegramBot = require('node-telegram-bot-api');
var moment = require('moment');
const axios = require('axios');
const TronWeb = require('tronweb');
var app = express();

app.use(cors())

const TRON_API_KEY = 'b8e255f4-8053-4505-90c7-a034943ee694';
const FULL_NODE = 'https://api.trongrid.io';
const SOLIDITY_NODE = 'https://api.trongrid.io';
const EVENT_SERVER = 'https://api.trongrid.io';
const tronWeb = new TronWeb(
    FULL_NODE,
    SOLIDITY_NODE,
    EVENT_SERVER
);

var bot = new TelegramBot(conf.token, {polling: true});
app.listen(conf.port, function () {})
var usdthuilv = 7
const userStates = new Map();

setInterval(() => {
    getusdthuilv()
}, 600*1000);
getusdthuilv()
function getusdthuilv() {
    request({
		url: `https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=CNY&baseCurrency=USDT&side=buy&paymentMethod=all&userType=blockTrade`, //aliPay wxPay
	}, (error, response, body) => {
		if (!error || response.statusCode == 200) {
			var allprice = 0
			try {
			    for (let index = 0; index < 10; index++) {
        			const element = JSON.parse(body).data.buy[index];
        			allprice+= parseFloat(element.price)
        		}
                usdthuilv = (allprice/10).toFixed(2)
			} catch (e) {
			    return
			}
		}
	})
}


async function saokuai() {
    let currentBlockNumber = null;
    let lastProcessedBlockNumber = null;

    currentBlockNumber = await tronWeb.trx.getCurrentBlock();
    currentBlockNumber = currentBlockNumber.block_header.raw_data.number;

    while(true) {
        try {
            const startTime = new Date();
            let timeToWait = 3000; // Wait 3 seconds by default
            // Skip the block we've already processed
            if (lastProcessedBlockNumber === currentBlockNumber) {
                console.log(`Skipping block ${currentBlockNumber} because it's already processed.`);
                currentBlockNumber += 1;
                continue;
            }
            try {
                const response = await axios.post('https://api.trongrid.io/wallet/getblockbynum', {
                    num: currentBlockNumber
                }, {
                    headers: {
                        'TRON-PRO-API-KEY': TRON_API_KEY
                    },
                    timeout: 5000
                });
            
                // 检查HTTP响应状态码
                if (response.status !== 200) {
                    console.log(`HTTP response status code is not 200, but ${response.status}`);
                    await sleep(2000);
                    continue;
                }
                const block = response.data;
                // 检查区块数据是否存在
                if (!block) {
                    console.log(`Block data is empty for block number: ${currentBlockNumber}`);
                    await sleep(2000);
                    continue;
                }
                if (!block.transactions) {
                    console.log(`transactions is empty for block number: ${currentBlockNumber}`);
                    await sleep(3000);
                    currentBlockNumber += 1;
                    continue;
                }
                const blockTimestamp = block.block_header.raw_data.timestamp / 1000;
                const blockDateTime = new Date(blockTimestamp * 1000);
                const formattedDateTime = blockDateTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
                const timeDifference = Math.abs(Date.now()/1000 - blockTimestamp);
                // console.log(timeDifference);
                if (timeDifference > 8) {
                    timeToWait = 1600;
                }
                const { chatIdAndAddress, Addresses } = await getAddressesFromDb();
                // console.log(chatIdAndAddress,1,Addresses)
                

                processBlock(block,formattedDateTime,chatIdAndAddress,Addresses);
                lastProcessedBlockNumber = currentBlockNumber;
                currentBlockNumber += 1;
            } catch (error) {
                console.log(`An unexpected error occurred: ${error}`);
                await sleep(2000);
                continue;
            }
            
            const elapsedTime = new Date() - startTime;
            if (elapsedTime < timeToWait) {
                await sleep(timeToWait - elapsedTime);
            }
        } catch (error) {
            console.log(`An unexpected error occurred: ${error}`);
            await sleep(2000);
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function processBlock(block, formattedDateTime, chatIdAndAddress, Addresses) {
    try {
        const promises = block.transactions.map(transaction =>
            processTransaction(transaction, formattedDateTime, chatIdAndAddress, Addresses)
        );
        await Promise.all(promises);
    } catch (e) {
        console.error(`Error occurred in processTransaction: ${e}`);
    }
}

async function processTransaction(transaction, formattedDateTime, chatIdAndAddress, Addresses) {
    const temporary = transaction.ret[0];
    const transactionId = transaction.txID;

    if ('ret' in transaction && 'contractRet' in temporary && temporary.contractRet === 'SUCCESS') {
        const parameter = transaction.raw_data.contract[0];
        const temporaryValue = parameter.parameter.value;

        // TRC20 transaction
        if (parameter.type === 'TriggerSmartContract' && temporaryValue.contract_address === '41a614f803b6fd780986a42c78ec9c7f77e6ded13c') {
            

            if (temporaryValue.data.substring(0, 8) === 'a9059cbb') {
                const xiangqing = `https://tronscan.org/?utm_source=tronlink #/transaction/${transactionId}?lang=zh`
                
                const fromAddress = tronWeb.address.fromHex(temporaryValue.owner_address);
                const toAddress = tronWeb.address.fromHex('41' + temporaryValue.data.slice(32, 72));
                
                const temporaryValueData = temporaryValue.data;

                
                if (Addresses.includes(fromAddress)) {
                    const usAmount = parseInt(temporaryValueData.slice(72, 136), 16);
                    if (usAmount >= 1000000) {
                        const chatIds = chatIdAndAddress.filter(item => item.address === fromAddress).map(item => item.chatIds).flat();

                        // await new Promise(resolve => setTimeout(resolve, 1000));
                        // const { balance, usdtBalance } = await getAccountInfo(fromAddress);
                        for (const chatId of chatIds) {
                            try {
                                // const listeningText = `❎ *支出： -${usAmount / 1000000} USDT* \n付款地址: ${fromAddress} \n收款地址: ${toAddress} \n交易时间: ${formattedDateTime} \n交易金额: ${usAmount / 1000000} USDT \nAccount Balance: ${balance.toFixed(2)} TRX, ${usdtBalance.toFixed(2)} USDT`;
                                const listeningText = `❎ *支出： -${usAmount / 1000000} USDT*| [查看交易详情](${xiangqing})\n付款地址: \`${fromAddress}\` \n收款地址: \`${toAddress} \`\n交易时间: ${formattedDateTime} \n交易金额: ${usAmount / 1000000} USDT`;
                                
                                
                                await bot.sendMessage(chatId, listeningText, { parse_mode: 'Markdown', disable_web_page_preview: true });
                            } catch (e) {
                                console.error(`Error sending message to chatId ${chatId}: ${e}`);
                                continue;
                            }
                        }
                    }
                }
                
                if (Addresses.includes(toAddress)) {
                    const usAmount = parseInt(temporaryValueData.slice(72, 136), 16);
                    if (usAmount >= 1000000) {
                        const chatIds = chatIdAndAddress.filter(item => item.address === toAddress).map(item => item.chatIds).flat();

                        // await new Promise(resolve => setTimeout(resolve, 1000));
                        // const { balance, usdtBalance } = await getAccountInfo(toAddress);
                        for (const chatId of chatIds) {
                            try {
                                // const listeningText = `✅ *Income +${usAmount / 1000000} USDT* \nPayment Address: ${fromAddress} \nReceipt Address: ${toAddress} \nTransaction Time: ${formattedDateTime} \nTransaction Amount: ${usAmount / 1000000} USDT \nAccount Balance: ${balance.toFixed(2)} TRX, ${usdtBalance.toFixed(2)} USDT`;
                                const listeningText = `✅ *收入： +${usAmount / 1000000} USDT* |[查看交易详情](${xiangqing})\n付款地址: \`${fromAddress}\` \n收款地址 : \`${toAddress} \`\n交易时间: ${formattedDateTime} \n交易金额: ${usAmount / 1000000} USDT`;
                                await bot.sendMessage(chatId, listeningText, { parse_mode: 'Markdown', disable_web_page_preview: true });
                            } catch (e) {
                                console.error(`Error sending message to chatId ${chatId}: ${e}`);
                                continue;
                            }
                        }
                    }
                }
                // Continue your logic here...
            }
            
        }
    }
}


saokuai();

bot.on("new_chat_members", (msg) => {
    if (msg.new_chat_member.id==conf.botid) {
        conf.pool.getConnection(function(err, connection) {
            if (err) return err;
            connection.query(`SELECT COUNT(*) FROM groupinfo where groupid = "${msg.chat.id}";`,(error, result)=> {
                if (error) return error;
                if (result[0]['COUNT(*)']==0) {
                    connection.query(`INSERT INTO groupinfo (groupid, groupname, state, adminid, createtime) VALUES ("${msg.chat.id}", "${utf16toEntities(msg.chat.title)}", "1", "${msg.from.id}", now());INSERT INTO groupadmin (groupid, adminid, createtime) VALUES ("${msg.chat.id}", "${msg.from.id}", now());`,(error, result)=> {
                        if (error) return error;
                        connection.destroy();
                    });
                }else{
                    connection.destroy();
                }
    
            });
    
        });
        bot.sendMessage(msg.chat.id,`感谢您把我添加到贵群!

设置费率   发送--   <code>设置费率x</code>
设置操作人 回复--   <code>设置操作人</code>


帮助 -- /help`,{
    parse_mode:"HTML"
})
    }
})
/*监听新的文字消息*/
bot.on('text', (msg) => {
    if(msg.chat.type=="group" || msg.chat.type=="supergroup"){
        if (msg.text.search("/start")!=-1 || msg.text=="开始") {
            kaishi(msg)
        }else if (msg.text.search("/help")==0 || msg.text=="帮助") {
            help(msg)
        }else if(checkarray(msg.from.id,conf.adminid) && msg.text=="授权"){
            shouquan(msg)
        }else if(checkarray(msg.from.id,conf.adminid) && msg.text=="解除授权"){
            unshouquan(msg)
        }else{
            conf.pool.getConnection(function(err, connection) {
                if (err) return err;
                connection.query(`SELECT * FROM groupinfo where groupid = "${msg.chat.id}" and state = "1" ORDER BY id asc LIMIT 1;SELECT * FROM groupadmin where adminid = "${msg.from.id}" and groupid = "${msg.chat.id}";`,(error, result)=> {
                    if (error) return error;
                    connection.destroy();
                    if (!result[0][0]) { //!result[0][0] || !result[1][0]
                        bot.sendMessage(msg.chat.id, "请发送文字 <code>开始</code> 或 /start 激活机器人",{
                            reply_markup: JSON.stringify({
                                inline_keyboard: conf.contact_inline_keyboard
                            }),
                            parse_mode:"HTML"
                        })
                        .then(res=>{
                            setTimeout(function () {
                                bot.deleteMessage(res.chat.id,res.message_id)
                            },10000)
                        })
                    }else{
                        // if(msg.text.length==34){
                        //     searchusdt(msg)
                        //  }else{
                            if(msg.text.search("\\+")>0 || msg.text.search("\\-")>0  || msg.text.search("/")>0  || msg.text.search("\\*")>0){
                                calculate(msg)
                            }else if(msg.text.search("u")!=-1){
                                usdttormb(msg)
                            }else if(msg.text.search("z")==0){
                                rmbtousdtzfb(msg)
                            }else if(msg.text.search("w")==0){
                                rmbtousdtwx(msg)
                            }else if(msg.text.search("k")==0){
                                rmbtousdtyhk(msg)
                            }else if(msg.text=="报备模板"){
                                baobeimuban(msg)
                            }else if(msg.text=="我的报备"){
                                wodebaobei(msg)
                            }else if(msg.text=="订单编号"){
                                bot.sendMessage(msg.chat.id,`<b>🎈请发送数字的订单编号查询，不要直接发送文字哦</b>`,{
                                    parse_mode:"HTML"
                                })
                            }
                            
                            if(msg.text.search("报备金额")!=-1 && msg.text.search("交易日期")!=-1){
                                baobeidingdan(msg)
                            }
                            var jzmode = result[0][0].jzmode;
                            if (jzmode == 2) {
                                if(msg.text=="1" || msg.text=="余额"){
                                    getbalance(msg)
                                }
                            }
                            bot.getChatMember(msg.chat.id, msg.from.id)
                    		.then(res=>{
                    			if (res.status=="administrator" || res.status=="creator" || result[1][0]) {
                                    if (msg.text.search("设置费率")==0) {
                                        shezhifeilv(msg)
                                    } else if (msg.text.search("设置汇率")==0) {
                                        shezhihuilv(msg)
                                    } else if (msg.text == "设置操作人") {
                                        shezhicaozuoren(msg)
                                    } else if (msg.text == "移除操作人") {
                                        yichucaozuoren(msg)
                                    }  else if (msg.text == "设置" || msg.text == "模式") {
                                        setgroup(msg)
                                    } else if(msg.text=="上课"){
                                        shangke(msg)
                                    } else if(msg.text=="下课"){
                                        xiake(msg)
                                    } else if(msg.text=="全部报备"){
                                        quanbubaobei(msg)
                                    } else if(msg.text=="清除报备"){
                                        qingchubaobei(msg)
                                    } else if(msg.text.search("dl")==0){
                                        deletebaobei(msg)
                                    } else if(msg.text.length==24 && !isNaN(Number(msg.text,10))){
                                        chazhaobaobei(msg)
                                    }else if (jzmode == 1) {
                                        if (msg.text.search("\\+") == 0) {
                                            prukuan(msg)
                                        } else if (msg.text.search("\\-") == 0) {
                                            pxiafa(msg)
                                        } else if (msg.text == "显示U" || msg.text == "显示u") {
                                            showusdt(msg)
                                        } else if (msg.text == "隐藏U" || msg.text == "隐藏u") {
                                            hideusdt(msg)
                                        } else if (msg.text == "账单" || msg.text == "查账") {
                                            zhangdan(msg)
                                        } else if (msg.text == "清除数据" || msg.text =="清空今日账单" || msg.text=="清除账单") {
                                            setqingli(msg)
                                        }
                                    } else if (jzmode == 2) {
                                        if (msg.reply_to_message) {
                                            if (msg.text.search("\\+") == 0 || msg.text.search("\\-")==0) {
                                                gongzijisuan(msg)
                                            }
                                        }else if (msg.text.search("@")==0) {
                                            yhmgongzijisuan(msg)
                                        }else if(msg.text=="2"){
                                            gongzitongji(msg.chat.id)
                                        } else if (msg.text =="工资清零") {
                                            gongziqingling(msg)
                                        }
                                    }
                    			}
                    		})
                    		.catch(err=>{
                    		    bot.sendMessage(msg.chat.id, '<b>❌获取身份失败，请将机器人设置为管理</b>',{
                                    parse_mode:"HTML"
                                })
                    		})
                        // }
                        
                    }

                });
            });
        }
    }else{
        if (msg.text=="/start") {
            help(msg)
            reply_markup(msg)
        }else if(msg.text.length==34){
            const state = userStates.get(msg.chat.id);
            if (state === 'adding_address') {
                const address = msg.text;
                conf.pool.getConnection(function(err, connection) {
                    if (err) throw err;
                    connection.query(`INSERT INTO Addresses (chat_id, address) VALUES ("${msg.chat.id}", "${address}");`, (error, result) => {
                        if (error) throw error;
                        connection.destroy();
                        bot.sendMessage(msg.chat.id, '地址已成功添加');
                    });
                });
                userStates.delete(msg.chat.id);
            } else if (state === 'deleting_address') {
                const address = msg.text;
                conf.pool.getConnection(function(err, connection) {
                    if (err) throw err;
                    connection.query(`DELETE FROM Addresses WHERE chat_id = "${msg.chat.id}" AND address = "${address}";`, (error, result) => {
                        if (error) throw error;
                        connection.destroy();
                        bot.sendMessage(msg.chat.id, '地址已成功删除');
                    });
                });
                userStates.delete(msg.chat.id);
            }else{searchusdt(msg);}
        }else if (msg.text.search("/help")==0 || msg.text=="帮助") {
            help(msg)
        }
        else if (msg.text.search("🔔地址监听")==0) {
            const message = msg;
            conf.pool.getConnection(function(err, connection) {
                if (err) throw err;
                connection.query(`SELECT * FROM Addresses where chat_id = "${message.chat.id}";`, (error, result) => {
                    if (error) throw error;
                    connection.destroy();
    
                    // 将查询结果转换为字符串形式
                    // let addresses = result.map(row => `Address: ${row.address}, Note: ${row.note}`).join('\n');
                    let addresses = result.map(row => `\`${row.address}\``).join('\n');
    
                    const opts = {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '添加地址', callback_data: 'add_address' },{ text: '删除地址', callback_data: 'delete_address' }],
                                
                            ]
                        }
                    };
                    bot.sendMessage(message.chat.id, `*地址列表:*\n${addresses}`, opts);
                });
            });
        }else if(checkarray(msg.from.id,conf.adminid)){
            if (msg.text=="统计") {
                tongji(msg)
            }
        }
    }
});

function calculate(msg) {
    try {
        bot.sendMessage(msg.chat.id, `<code>${eval(msg.text)}</code>`, {
            reply_to_message_id: msg.message_id,
            parse_mode:"HTML"
        });
        return;
    } catch (error) {
        return;
    }
  }

function xiake(msg) {
    bot.getChatMember(msg.chat.id,msg.from.id)
    .then(res=>{
        if (res.status=="administrator" || res.status=="creator") {
            bot.setChatPermissions(msg.chat.id, {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false,
            })
            .then(() => {
              bot.sendMessage(msg.chat.id, '<b>✅已开启禁言</b>',{
                parse_mode:"HTML"
              });
            })
            .catch((error) => {
                bot.sendMessage(msg.chat.id, '<b>❌禁言失败，请重试</b>',{
                    parse_mode:"HTML"
                })
            });
        }
    })
}

function shangke(msg) {
    bot.getChatMember(msg.chat.id,msg.from.id)
    .then(res=>{
        if (res.status=="administrator" || res.status=="creator") {
            bot.setChatPermissions(msg.chat.id, {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: false,
                can_send_other_messages: true,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: true,
                can_pin_messages: false,
            })
            .then(() => {
              bot.sendMessage(msg.chat.id, '<b>✅已关闭禁言</b>',{
                parse_mode:"HTML"
              });
            })
            .catch((error) => {
              bot.sendMessage(msg.chat.id, '<b>❌关闭禁言失败，请重试</b>',{
                parse_mode:"HTML"
              });
            });
        }
    })
}


function gongziqingling(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`delete from gongzi where groupid = "${msg.chat.id}";update userinfo set balance = 0 where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, '<b>✅成功清除本群工资数据</b>',{
                parse_mode:"HTML"
              });
        })
    })
}
function setqingli(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`delete from jizhang where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, '<b>✅成功清除本群记录数据</b>',{
                parse_mode:"HTML"
              });
        })
    })
}
function getAddressesFromDb() {
    return new Promise((resolve, reject) => {
        conf.pool.getConnection((err, connection) => {
            if (err) {
                return reject(err);
            }

            connection.query('SELECT chat_id, address FROM Addresses', (error, results) => {
                connection.release();
                if (error) {
                    reject(error);
                } else {
                    let groupedResults = {};
                    let addresses = [];
                    results.forEach(result => {
                        if (groupedResults[result.address]) {
                            groupedResults[result.address].push(result.chat_id);
                        } else {
                            groupedResults[result.address] = [result.chat_id];
                            addresses.push(result.address);
                        }
                    });

                    let tuples = Object.entries(groupedResults).map(([address, chatIds]) => ({address, chatIds}));
                    resolve({chatIdAndAddress: tuples, Addresses: addresses});
                }
            });
        });
    });
}



bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    if (callbackQuery.data.search("chbb")==0) {
        chbb(callbackQuery)
    }
    if (callbackQuery.data==='6') {
        const message = callbackQuery.message;
        conf.pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(`SELECT * FROM Addresses where chat_id = "${message.chat.id}";`, (error, result) => {
                if (error) throw error;
                connection.destroy();

                // 将查询结果转换为字符串形式
                let addresses = result.map(row => `\`${row.address}\``).join('\n');
    
                    const opts = {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '添加地址', callback_data: 'add_address' },{ text: '删除地址', callback_data: 'delete_address' }],
                                
                            ]
                        }
                    };
                bot.sendMessage(message.chat.id, `*地址列表:*\n${addresses}`, opts);
            });
        });
    }
    else if (callbackQuery.data === 'add_address') {
        const message = callbackQuery.message;
        userStates.set(message.chat.id, 'adding_address');
        bot.sendMessage(message.chat.id, '请发送要添加的TRX地址');
    } else if (callbackQuery.data === 'delete_address') {
        const message = callbackQuery.message;
        userStates.set(message.chat.id, 'deleting_address');
        bot.sendMessage(message.chat.id, '请发送要删除的TRX地址');
    }
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`SELECT * FROM groupinfo where groupid = "${callbackQuery.message.chat.id}" and state = "1";SELECT * FROM groupadmin where adminid = "${callbackQuery.from.id}" and groupid = "${callbackQuery.message.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.getChatMember(callbackQuery.message.chat.id, callbackQuery.from.id)
            .then(res=>{
                if (res.status=="administrator" || res.status=="creator" || result[1][0]) {
                    if (callbackQuery.data.search("sethuilvmode_")==0) {
                        sethuilvmode(callbackQuery)
                    }else if (callbackQuery.data.search("tybb")==0) {
                        tybb(callbackQuery)
                    }else if (callbackQuery.data.search("jjbb")==0) {
                        jjbb(callbackQuery)
                    }
                }
            })

        });
    });
});

function sethuilvmode(callbackQuery) {
    var mode = callbackQuery.data.split("sethuilvmode_")[1]
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from groupinfo where groupid = "${callbackQuery.message.chat.id}";update groupinfo set huilvmode = ${mode} WHERE groupid = "${callbackQuery.message.chat.id}"; update groupinfo set jzmode = ${mode} WHERE groupid = "${callbackQuery.message.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            var setkeyboard = []
            setkeyboard.push([{text:`${mode==1?"✅":""}普通汇率模式`,callback_data:`sethuilvmode_1`},{text:`${mode==2?"✅":""}工资结算模式`,callback_data:`sethuilvmode_2`}])
            var modehit = ""
            if (mode==1) {
                modehit = `✅已启用普通汇率模式\n💹当前费率 ${result[0][0].feilv}\n📉当前汇率 ${(result[0][0].huilv?result[0][0].huilv:usdthuilv)}`
            }else if (mode==2) {
                modehit = `✅已启用工资结算模式\n🔣回复+-调整工资\n👤会员输入1查询工资\n👨‍✈️管理输入2列出账单`
            }
            bot.editMessageText( `<b>记账模式设置</b>\n\n<b>${modehit}</b>`,{
                message_id:callbackQuery.message.message_id,
                chat_id:callbackQuery.message.chat.id,
                parse_mode:"HTML",
                reply_markup:{
                    inline_keyboard:setkeyboard
                }
            })

        });
    });
}

function chbb(callbackQuery) {
    var orderid = callbackQuery.data.split("chbb")[1].split("_")[0]
    var telegramid = callbackQuery.data.split("chbb")[1].split("_")[1]
    if (telegramid!=callbackQuery.from.id) {
        return
    }
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where orderid = "${orderid}";update baobei set state = -2,shenhetime = now(),shenheusername = "${(callbackQuery.from.username?callbackQuery.from.username:"")}",shenhenickname = "${(callbackQuery.from.first_name?callbackQuery.from.first_name:"")+(callbackQuery.from.last_name?callbackQuery.from.last_name:"")}" WHERE groupid = "${callbackQuery.message.chat.id}" and orderid = "${orderid}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.editMessageText( `${utf16toEntities(result[0][0].content)}\n\n报备编号：<code>${orderid}</code>\n报备状态：会员【<a href="http://t.me/${(callbackQuery.from.username?callbackQuery.from.username:"")}">${(callbackQuery.from.first_name?callbackQuery.from.first_name:"")+(callbackQuery.from.last_name?callbackQuery.from.last_name:"")}</a>】撤回⏪`,{
                message_id:callbackQuery.message.message_id,
                chat_id:callbackQuery.message.chat.id,
                parse_mode:"HTML",
                disable_web_page_preview:true
            })

        });
    });
}

function tybb(callbackQuery) {
    var orderid = callbackQuery.data.split("tybb")[1]
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where orderid = "${orderid}";update baobei set state = 1,shenhetime = now(),shenheusername = "${(callbackQuery.from.username?callbackQuery.from.username:"")}",shenhenickname = "${(callbackQuery.from.first_name?callbackQuery.from.first_name:"")+(callbackQuery.from.last_name?callbackQuery.from.last_name:"")}" WHERE groupid = "${callbackQuery.message.chat.id}" and orderid = "${orderid}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.editMessageText( `<b>结账后记得消除此单报备\n管理输入[dl+单号]可销单</b>\n\n${utf16toEntities(result[0][0].content)}\n\n报备编号：<code>${orderid}</code>\n报备状态：管理【<a href="http://t.me/${(callbackQuery.from.username?callbackQuery.from.username:"")}">${(callbackQuery.from.first_name?callbackQuery.from.first_name:"")+(callbackQuery.from.last_name?callbackQuery.from.last_name:"")}</a>】同意✅`,{
                message_id:callbackQuery.message.message_id,
                chat_id:callbackQuery.message.chat.id,
                parse_mode:"HTML",
                disable_web_page_preview:true
            })

        });
    });
}


function jjbb(callbackQuery) {
    var orderid = callbackQuery.data.split("jjbb")[1]
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where orderid = "${orderid}";update baobei set state = -1,shenhetime = now(),shenheusername = "${(callbackQuery.from.username?callbackQuery.from.username:"")}",shenhenickname = "${(callbackQuery.from.first_name?callbackQuery.from.first_name:"")+(callbackQuery.from.last_name?callbackQuery.from.last_name:"")}" WHERE groupid = "${callbackQuery.message.chat.id}" and orderid = "${orderid}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.editMessageText( `${utf16toEntities(result[0][0].content)}\n\n报备编号：<code>${orderid}</code>\n报备状态：管理【<a href="http://t.me/${(callbackQuery.from.username?callbackQuery.from.username:"")}">${(callbackQuery.from.first_name?callbackQuery.from.first_name:"")+(callbackQuery.from.last_name?callbackQuery.from.last_name:"")}</a>】拒绝🚫`,{
                message_id:callbackQuery.message.message_id,
                chat_id:callbackQuery.message.chat.id,
                parse_mode:"HTML",
                disable_web_page_preview:true
            })

        });
    });
}


function setgroup(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`SELECT * FROM groupinfo where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            if (!result[0]) {
                bot.sendMessage(msg.chat.id, `请先发送消息 <code>开始</code>,激活此群`,{
                    parse_mode:"HTML"
                });
            }else{
                var setkeyboard = []
                setkeyboard.push([{text:`${result[0].jzmode==1?"✅":""}普通汇率模式`,callback_data:`sethuilvmode_1`},{text:`${result[0].jzmode==2?"✅":""}工资结算模式`,callback_data:`sethuilvmode_2`}])
                var modehit = ""
                if (result[0].jzmode==1) {
                    modehit = `✅已启用普通汇率模式\n💹当前费率 ${result[0].feilv}\n📉当前汇率 ${(result[0].huilv?result[0].huilv:usdthuilv)}`
                }else if (result[0].jzmode==2) {
                    modehit = `✅已启用工资结算模式\n🔣回复+-调整工资\n👤会员输入1查询工资\n👨‍✈️管理输入2列出账单`
                }
                bot.sendMessage(msg.chat.id, `<b>记账模式设置</b>\n\n<b>${modehit}</b>`,{
                    parse_mode:"HTML",
                    reply_markup:{
                        inline_keyboard:setkeyboard
                    }
                }).then((m) => {
                    
                })
            }

        });

    });
}

/*监听错误*/
bot.on('error', (error) => {
    console.log("监听到普通错误："+error);
});
bot.on('polling_error', (error) => {
    console.log("监听到轮循错误："+error);
});
bot.on('webhook_error', (error) => {
    console.log("监听到webhook错误："+error);
});



function kaishi(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`SELECT COUNT(*) FROM groupinfo where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            if (result[0]['COUNT(*)']==0) {
                connection.query(`INSERT INTO groupinfo (groupid, groupname, state, adminid, createtime) VALUES ("${msg.chat.id}", "${utf16toEntities(msg.chat.title)}", "1", "${msg.from.id}", now());INSERT INTO groupadmin (groupid, adminid, createtime) VALUES ("${msg.chat.id}", "${msg.from.id}", now());`,(error, result)=> {
                    if (error) return error;
                    connection.destroy();
                    bot.sendMessage(msg.chat.id, `<b>✅创建成功</b>`,{
                        parse_mode:"HTML"
                    });
                });
            }else{
                connection.destroy();
                bot.sendMessage(msg.chat.id, `<b>✅已经开始了，请继续记账！</b>`,{
                    parse_mode:"HTML"
                });
            }

        });

    });
}



function prukuan(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        // 使用正则表达式提取金额和汇率值
        var match = msg.text.match(/\+(\d+(\.\d+)?)(\/(\d+(\.\d+)?))?/);
        var amount = match ? parseFloat(match[1]) : null;
        var huilv = match && match[4] ? parseFloat(match[4]) : null;
        if(amount != null) {
            connection.query(`select * from groupinfo where groupid = "${msg.chat.id}";`, (error, result)=> {
                if (error) return error;
                var groupinfo = result[0];
                var finalHuilv = huilv ? huilv : (groupinfo.huilv?groupinfo.huilv:usdthuilv);
                connection.query(`INSERT INTO jizhang (groupid, telegramid, huilv, amount,usdtamount, messageid, time,caozuoren) VALUES ("${msg.chat.id}", "${msg.from.id}", ${finalHuilv}, ${amount} ,${amount/finalHuilv}, "${msg.message_id}", now(),"${utf16toEntities((msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:""))}");`, (error, result)=> {
                    if (error) return error;
                    connection.query(`select * from jizhang where groupid = "${msg.chat.id}"  and amount > 0  order by id desc limit 5;
                        select * from jizhang where groupid = "${msg.chat.id}"  and amount < 0  order by id desc limit 5;
                        select sum(amount),sum(usdtamount) from jizhang where groupid = "${msg.chat.id}";
                        select count(*) from jizhang where groupid = "${msg.chat.id}" and amount > 0 ;
                        select sum(amount),sum(usdtamount) from jizhang where groupid = "${msg.chat.id}" and amount > 0 ;
                        select count(*) from jizhang where groupid = "${msg.chat.id}" and amount < 0 ;
                            select sum(amount),sum(usdtamount) from jizhang where groupid = "${msg.chat.id}" and amount < 0 ;`,(error, result)=> {
                       if (error) return error;
                        connection.destroy();
                        var rlist = "";
                        for (let index = 0; index < result[0].length; index++) {
                            rlist = `<code>${result[0][index].time.split(" ")[1]}</code>   <b>${result[0][index].amount} ${groupinfo.isshowusdt==1?`/ ${result[0][index].huilv} = ${(result[0][index].usdtamount).toFixed(2)}U`:""}</b>\n${rlist}`;
                        }
                        var xlist = "";
                        for (let index = 0; index < result[1].length; index++) {
                            xlist = `<code>${result[1][index].time.split(" ")[1]}</code>   <b>${-result[1][index].amount} ${groupinfo.isshowusdt==1?`( ${(-result[1][index].usdtamount).toFixed(2)}U )`:""}</b>\n${xlist}`;
                        }

                        var userhuilv = groupinfo.huilv
                        if (groupinfo.huilvmode==1) {
                            userhuilv = usdthuilv
                        }
                        bot.sendMessage(msg.chat.id, `入款 ( <code>${result[3][0]["count(*)"]}</code> 笔 )：\n${rlist}\n下发 ( <code>${result[5][0]["count(*)"]}</code> 笔 )：\n${xlist}\n\n费率：<code>${(groupinfo.feilv).toFixed(2)}</code>  %
总入款：<code>${(result[4][0]["sum(amount)"]?result[4][0]["sum(amount)"]:0).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(result[4][0]["sum(usdtamount)"]?result[4][0]["sum(usdtamount)"]:0).toFixed(2)}U</code>`:""}
应下发：<code>${(result[4][0]["sum(amount)"]?result[4][0]["sum(amount)"]*(1-groupinfo.feilv/100):0).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(result[4][0]["sum(usdtamount)"]?result[4][0]["sum(usdtamount)"]*(1-groupinfo.feilv/100):0).toFixed(2)}U</code>`:""}
总下发：<code>${(result[6][0]["sum(amount)"]?-result[6][0]["sum(amount)"]:0).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(result[6][0]["sum(usdtamount)"]?-result[6][0]["sum(usdtamount)"]:0).toFixed(2)}U</code>`:""}
未下发： <code>${(((result[4][0]["sum(amount)"]?+result[6][0]["sum(amount)"]:0)-(result[4][0]["sum(amount)"]?-result[4][0]["sum(amount)"]:0)*(1-groupinfo.feilv/100))).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(((result[4][0]["sum(usdtamount)"]?+result[6][0]["sum(usdtamount)"]:0)-(result[4][0]["sum(usdtamount)"]?-result[4][0]["sum(usdtamount)"]:0)*(1-groupinfo.feilv/100))).toFixed(2)}U</code>`:""}`,{
                            parse_mode:"HTML",
                            reply_markup:{
                                inline_keyboard:[
                                    [{text:"🧾历史账单",url:`${conf.mainurl}?groupid=${msg.chat.id}&apiType=xxapi`}]
                                ]
                            }
                        });
                     });
                });
            });
        }
    });
}



function pxiafa(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        var amount = parseFloat(msg.text);
        connection.query(`select * from groupinfo where groupid = "${msg.chat.id}";`, (error, result)=> {
            if (error) return error;
            var groupinfo = result[0]
            connection.query(`INSERT INTO jizhang (groupid, telegramid, huilv, amount,usdtamount, messageid, time,caozuoren) VALUES ("${msg.chat.id}", "${msg.from.id}", ${(groupinfo.huilv?groupinfo.huilv:usdthuilv)}, ${amount} ,${amount/(groupinfo.huilv?groupinfo.huilv:usdthuilv)}, "${msg.message_id}", now(),"${utf16toEntities((msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:""))}");`, (error, result)=> {
                if (error) return error;
                connection.query(`select * from jizhang where groupid = "${msg.chat.id}"  and amount > 0  order by id desc limit 5;
                    select * from jizhang where groupid = "${msg.chat.id}"  and amount < 0  order by id desc limit 5;
                    select sum(amount),sum(usdtamount) from jizhang where groupid = "${msg.chat.id}";
                    select count(*) from jizhang where groupid = "${msg.chat.id}" and amount > 0 ;
                    select sum(amount),sum(usdtamount) from jizhang where groupid = "${msg.chat.id}" and amount > 0 ;
                    select count(*) from jizhang where groupid = "${msg.chat.id}" and amount < 0 ;
                    select sum(amount),sum(usdtamount) from jizhang where groupid = "${msg.chat.id}" and amount < 0 ;`,(error, result)=> {
                    if (error) return error;
                    connection.destroy();
                    var rlist = "";
                    for (let index = 0; index < result[0].length; index++) {
                        rlist = `<code>${result[0][index].time.split(" ")[1]}</code>   <b>${result[0][index].amount} ${groupinfo.isshowusdt==1?`/ ${result[0][index].huilv} = ${(result[0][index].usdtamount).toFixed(2)}U`:""}</b>\n${rlist}`;
                    }
                    var xlist = "";
                    for (let index = 0; index < result[1].length; index++) {
                        xlist = `<code>${result[1][index].time.split(" ")[1]}</code>   <b>${-result[1][index].amount} ${groupinfo.isshowusdt==1?`( ${(-result[1][index].usdtamount).toFixed(2)}U )`:""}</b>\n${xlist}`;
                    }

                    var userhuilv = groupinfo.huilv
                    if (groupinfo.huilvmode==1) {
                        userhuilv = usdthuilv
                    }
                    bot.sendMessage(msg.chat.id, `入款 ( <code>${result[3][0]["count(*)"]}</code> 笔 )：\n${rlist}\n下发 ( <code>${result[5][0]["count(*)"]}</code> 笔 )：\n${xlist}\n\n费率：<code>${(groupinfo.feilv).toFixed(2)}</code>  %
总入款：<code>${(result[4][0]["sum(amount)"]?result[4][0]["sum(amount)"]:0).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(result[4][0]["sum(usdtamount)"]?result[4][0]["sum(usdtamount)"]:0).toFixed(2)}U</code>`:""}
应下发：<code>${(result[4][0]["sum(amount)"]?result[4][0]["sum(amount)"]*(1-groupinfo.feilv/100):0).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(result[4][0]["sum(usdtamount)"]?result[4][0]["sum(usdtamount)"]*(1-groupinfo.feilv/100):0).toFixed(2)}U</code>`:""}
总下发：<code>${(result[6][0]["sum(amount)"]?-result[6][0]["sum(amount)"]:0).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(result[6][0]["sum(usdtamount)"]?-result[6][0]["sum(usdtamount)"]:0).toFixed(2)}U</code>`:""}
未下发： <code>${(((result[4][0]["sum(amount)"]?+result[6][0]["sum(amount)"]:0)-(result[4][0]["sum(amount)"]?-result[4][0]["sum(amount)"]:0)*(1-groupinfo.feilv/100))).toFixed(2)}</code> ${groupinfo.isshowusdt==1?`| <code>${(((result[4][0]["sum(usdtamount)"]?+result[6][0]["sum(usdtamount)"]:0)-(result[4][0]["sum(usdtamount)"]?-result[4][0]["sum(usdtamount)"]:0)*(1-groupinfo.feilv/100))).toFixed(2)}U</code>`:""}`,{
                        parse_mode:"HTML",
                        reply_markup:{
                            inline_keyboard:[
                                [{text:"🧾历史账单",url:`${conf.mainurl}?groupid=${msg.chat.id}&apiType=xxapi`}]
                            ]
                        }
                    });
                });
            });
        });
    });
}

function yhmgongzijisuan(msg) {
    if (typeof msg.text !== 'string') {
        console.error('msg.text 不是一个有效的字符串');
        return;
    }

    // 分割消息字符串
    var parts = msg.text.split(" ");
    if (parts.length < 2) {
        console.error('消息格式不正确');
        return;
    }
    var username = msg.text.split(" ")[0].split("@")[1]
    // var amount = parseFloat(msg.text.split(" ")[1])
    var amount = msg.text.split(" ")[1];
    var parsedAmount = parseFloat(amount);
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from userinfo where groupid = "${msg.chat.id}" and username = "${username}";`,(error, result)=> {
            if (error) return error;
            var balance = 0;
            var gongzimode = ""
            if (amount.search("\\+") === 0) {
                balance = parsedAmount;
                gongzimode = `工资派发 +${parsedAmount}`;
            } else if (amount.search("\\-") === 0) {
                balance = parsedAmount;
                gongzimode = `工资变现 ${parsedAmount}`;
            } else {
                connection.release();
                return;
            }
            if (!result[0]) {
                connection.destroy();
                bot.sendMessage(msg.chat.id, `❌用户未注册，请发 <code>1</code> 注册！`,{
                    parse_mode:"HTML"
                });
            }else{
                connection.query(`INSERT INTO gongzi (amount,telegramid,groupid,caozuorenid,time) VALUES (${amount}, "${result[0].userid}","${msg.chat.id}", "${msg.from.id}", now());update userinfo set balance = balance ${amount} where groupid = "${msg.chat.id}" and userid = "${result[0].userid}";`,(error, res)=> {
                    connection.destroy();
                    if (error) return error;
                    bot.sendMessage(msg.chat.id, `<b>✅【<a href="http://t.me/${result[0].username}">${result[0].nickname}</a>】${gongzimode}</b>\n\n账号：<code>${result[0].userid}</code>\n余额：<code>${result[0].balance+(parseFloat(balance))}</code>\n时间：<code>${moment().format("YYYY-MM-DD HH:mm:ss")}</code>\n操作：<a href="http://t.me/${(msg.from.username?msg.from.username:"")}">${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}</a>`,{
                        parse_mode:"HTML",
                        disable_web_page_preview:true
                    });
                });

            }

        });

    });

}

function gongzijisuan(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from userinfo where groupid = "${msg.chat.id}" and userid = "${msg.reply_to_message.from.id}";`,(error, result)=> {
            if (error) return error;
            var balance = 0;
            var gongzimode = ""
            if (msg.text.search("\\+")==0) {
                balance = msg.text.split("+")[1]
                gongzimode = `工资派发 +${parseFloat(msg.text)}`
            }else if (msg.text.search("\\-")==0) {
                balance = msg.text
                gongzimode = `工资变现 ${parseFloat(msg.text)}`
            }else{
                connection.destroy();
                return
            }
            if (!result[0]) {
                connection.query(`INSERT INTO userinfo (nickname, username, userid,groupid,balance, createtime) VALUES ("${ utf16toEntities((msg.reply_to_message.from.first_name?msg.reply_to_message.from.first_name:"")+(msg.reply_to_message.from.last_name?msg.reply_to_message.from.last_name:""))}", "${(msg.reply_to_message.from.username?msg.reply_to_message.from.username:"未设置用户名")}", "${msg.reply_to_message.from.id}", "${msg.chat.id}",${balance}, now());`,(error, res)=> {
                    connection.destroy();
                    if (error) return error;
                    bot.sendMessage(msg.chat.id, `<b>✅【<a href="http://t.me/${(msg.reply_to_message.from.username?msg.reply_to_message.from.username:"")}">${(msg.reply_to_message.from.first_name?msg.reply_to_message.from.first_name:"")+(msg.reply_to_message.from.last_name?msg.reply_to_message.from.last_name:"")}</a>】${gongzimode}</b>\n\n账号：<code>${msg.from.id}</code>\n余额：<code>${balance}</code>\n时间：<code>${moment().format("YYYY-MM-DD HH:mm:ss")}</code>\n操作：<a href="http://t.me/${(msg.from.username?msg.from.username:"")}">${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}</a>`,{
                        parse_mode:"HTML",
                        disable_web_page_preview:true
                    });
                });
            }else{
                connection.query(`INSERT INTO gongzi (amount,telegramid,groupid,caozuorenid,time) VALUES (${msg.text}, "${msg.reply_to_message.from.id}","${msg.chat.id}", "${msg.from.id}", now());update userinfo set balance = balance ${msg.text} where groupid = "${msg.chat.id}" and userid = "${msg.reply_to_message.from.id}";`,(error, res)=> {
                    connection.destroy();
                    if (error) return error;
                    bot.sendMessage(msg.chat.id, `<b>✅【<a href="http://t.me/${(msg.reply_to_message.from.username?msg.reply_to_message.from.username:"")}">${(msg.reply_to_message.from.first_name?msg.reply_to_message.from.first_name:"")+(msg.reply_to_message.from.last_name?msg.reply_to_message.from.last_name:"")}</a>】${gongzimode}</b>\n\n账号：<code>${msg.from.id}</code>\n余额：<code>${result[0].balance+(parseFloat(balance))}</code>\n时间：<code>${moment().format("YYYY-MM-DD HH:mm:ss")}</code>\n操作：<a href="http://t.me/${(msg.from.username?msg.from.username:"")}">${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}</a>`,{
                        parse_mode:"HTML",
                        disable_web_page_preview:true
                    });
                });

            }

        });

    });

}


function getbalance(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from userinfo where groupid = "${msg.chat.id}" and userid = "${msg.from.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            if (result[0]) {
                bot.sendMessage(msg.chat.id, `<b>⚠️未结账金额：</b><code>${result[0].balance}</code>`,{
                    parse_mode:"HTML"
                });
            }else{
                bot.sendMessage(msg.chat.id, `<b>⚠️未结账金额：</b><code>0</code>`,{
                    parse_mode:"HTML"
                });
            }
            
        });

    });

}


function gongzitongji(chatid) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select sum(balance) from userinfo where groupid = "${chatid}";select * from userinfo where groupid = "${chatid}" and balance != 0 order by balance desc;
        `,(error, result)=> {
            connection.destroy();
            if (error) return error;
            var weijiesuanusers = ""
            for (let index = 0; index < result[1].length; index++) {
                weijiesuanusers += `<a href="http://t.me/${result[1][index].username}">${entitiestoUtf16(result[1][index].nickname)}</a>：<code>${result[1][index].balance}</code>\n`;

            }
            bot.sendMessage(chatid, `<b>当前报备总金额：</b><code>${(result[0][0]["sum(balance)"]?result[0][0]["sum(balance)"]:0)}</code>\n\n<b>报备人员详情：</b>\n${weijiesuanusers} `,{
                parse_mode:"HTML",
                disable_web_page_preview:true
            });
        });
    });
}

function shouquan(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`update groupinfo set state = 1 WHERE groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `此群已成功授权`,{
                reply_to_message_id: msg.message_id,
                parse_mode:"HTML"
            });

        });
    });
}

function unshouquan(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`update groupinfo set state = 0 WHERE groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `此群已取消授权`,{
                reply_to_message_id: msg.message_id,
                parse_mode:"HTML"
            });

        });
    });
}

function tongji(msg) {
	conf.pool.getConnection(function(err, connection) {
        if(err) return err
        connection.query(`SELECT COUNT(*) FROM users where registertime LIKE CONCAT(CURDATE(), '%');
        SELECT COUNT(*) FROM users;
        SELECT COUNT(*) FROM groupinfo where createtime LIKE CONCAT(CURDATE(), '%');
        SELECT COUNT(*) FROM groupinfo;
        SELECT COUNT(*) FROM jizhang where time LIKE CONCAT(CURDATE(), '%');
        SELECT COUNT(*) FROM jizhang;`,(error, result)=> {
            connection.destroy();
			if(error) return error
            bot.sendMessage(msg.chat.id, `用户数量 <code>${result[1][0]['COUNT(*)']}</code> 人（今日 <code>${result[0][0]['COUNT(*)']}</code> 人）
累计群组 <code>${result[3][0]['COUNT(*)']}</code> 次（今日 <code>${result[2][0]['COUNT(*)']}</code> 次）
累计记账 <code>${result[5][0]['COUNT(*)']}</code> 次 （今日 <code>${result[4][0]['COUNT(*)']}</code> 次）`,{
				parse_mode: 'HTML',
			});
        });
    });
}

function yichucaozuoren(msg) {
    if (!msg.reply_to_message) {
        return
    }
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`DELETE FROM groupadmin WHERE adminid = "${msg.reply_to_message.from.id}" and groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `<b>✅移除操作人成功! 当前操作人:<a href="http://t.me/${msg.reply_to_message.from.username}">${(msg.reply_to_message.from.first_name?msg.reply_to_message.from.first_name:"")+(msg.reply_to_message.from.last_name?msg.reply_to_message.from.last_name:"")}</a></b>`,{
                parse_mode:"HTML",
                disable_web_page_preview:true
            });

        });
    });
}

function shezhicaozuoren(msg) {
    if (!msg.reply_to_message) {
        return
    }
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;

        connection.query(`INSERT INTO groupadmin (groupid, adminid, createtime) VALUES ("${msg.chat.id}", "${msg.reply_to_message.from.id}", now());`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `<b>✅添加操作人成功！当前操作人:<a href="http://t.me/${msg.reply_to_message.from.username}">${(msg.reply_to_message.from.first_name?msg.reply_to_message.from.first_name:"")+(msg.reply_to_message.from.last_name?msg.reply_to_message.from.last_name:"")}</a></b>`,{
                parse_mode:"HTML",
                disable_web_page_preview:true
            });

        });
    });
}



function showusdt(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`update groupinfo set isshowusdt  = 1 where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `<b>✅开启USDT显示！</b>`,{
                parse_mode:"HTML"
            });
        });
    });
}

function hideusdt(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`update groupinfo set isshowusdt  = 0 where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `<b>✅开启USDT隐藏！</b>`,{
                parse_mode:"HTML"
            });
        });
    });
}

function shezhifeilv(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`update groupinfo set feilv  = ${msg.text.split("设置费率")[1]} where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `<b>✅手续费已更新为${msg.text.split("设置费率")[1]}%</b>`,{
                parse_mode:"HTML"
            });

        });
    });
}

function shezhihuilv(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`update groupinfo set huilv  = ${msg.text.split("设置汇率")[1]} where groupid = "${msg.chat.id}";`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `<b>✅设置USDT汇率${msg.text.split("设置汇率")[1]}成功！</b>`,{
                parse_mode:"HTML"
            });

        });
    });
}


function searchusdt(msg) {
    var address = msg.text
    if (!address.startsWith('T')) {
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'TRON-PRO-API-KEY': '9b1950d1-74c6-4099-bbea-68a00c9ab4d4' // 여기에 실제 API 키를 입력하세요.
    };
    bot.sendMessage(msg.chat.id,`⌛正在查询中，请稍后...`)
    .then(res=>{
        request(`https://apilist.tronscanapi.com/api/accountv2?address=${address}`, { headers })
        .then((body)=>{
            var data = JSON.parse(body)
            var usdtbalance = 0;
            var trxbalance = 0;
            var createtime = moment(data.date_created).format("YYYY-MM-DD HH:mm:ss")
            for (let index = 0; index < data.withPriceTokens.length; index++) {
                if (data.withPriceTokens[index].tokenId=="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t") {
                    usdtbalance = data.withPriceTokens[index].balance/1000000
                }else if(data.withPriceTokens[index].tokenName=="trx"){
                    trxbalance = data.withPriceTokens[index].balance/1000000
                }
            }
            request(`https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=50&start=0&sort=-timestamp&count=true&filterTokenValue=0&token_id=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&relatedAddress=${address}`, { headers })
            .then((body)=>{
                var alltransfer = JSON.parse(body).token_transfers
                var allshouru = 0;
                var allzhichu = 0;
                var value = parseInt(JSON.parse(body).total/50)
                for (let index = 0; index < alltransfer.length; index++) {
                    if (alltransfer[index].contract_address=="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t") {
                        if (alltransfer[index].to_address==address) {
                            allshouru += parseFloat(alltransfer[index].quant/1000000)
                        }else if(alltransfer[index].from_address==address){
                            allzhichu += parseFloat(alltransfer[index].quant/1000000)
                        }
                    }
                }
                bot.editMessageText(`<b>查询地址: </b>\n<code>${address}</code>\n\n<b>USDT余额：</b><code>${usdtbalance}</code>\n<b>TRX余额：</b><code>${trxbalance}</code>\n\n历史交易：<code>${JSON.parse(body).total} 次</code>\n创建时间：<code>${createtime}</code>`,{
                    parse_mode: 'HTML',
                    reply_to_message_id: msg.message_id,
                    chat_id:res.chat.id,
                    message_id:res.message_id
                });
            })
        })
    })
    
}

function usdttormb(msg) {
    var amount = parseInt(msg.text.split("u")[0])
    if (parseInt(amount)<0 || parseInt(amount)%1!=0) {
        return
    }
    request({
        url: 'https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=cny&baseCurrency=usdt&side=sell&paymentMethod=all',
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            var sendvalue = "<b>欧易(<code>OKX</code>) USDT实时汇率</b>\n\n";
            var allprice = 0
            for (let index = 0; index < 10; index++) {
                const element = JSON.parse(body).data.sell[index];
                sendvalue = `${sendvalue}<code>${index+1}) ${element.price}</code>      <code>${element.nickName}</code>\n` // 수정된 부분
                allprice+= parseFloat(element.price)
            }
            conf.pool.getConnection(function(err, connection) {
                if (err) return err;
                connection.query(`SELECT * FROM mingyan ORDER BY RAND() LIMIT 1;`,(error, result)=> {
                    connection.destroy();
                    if (error) return error;
                    if (result[0]) {
                        sendvalue =`<a href="${conf.pindaolink}">${result[0].content}\n                   <b>—  黑石担保.</b></a>\n${sendvalue}\n本群费率：0%
本群汇率：实时汇率`
                        // 实时价格（三档）：\n${amount} * ${(allprice/10).toFixed(2)} = ${(amount*(allprice/10)).toFixed(2)}</b>`
                        bot.sendMessage(msg.chat.id,sendvalue,{
                            parse_mode:"HTML",
                            disable_web_page_preview:true
                        });
                    }
        
                });
            });
            
        }
    })
}


function rmbtousdtyhk(msg) {
    var amount = msg.text.split("k")[1]
    if (parseInt(amount)<0 || parseInt(amount)%1!=0) {
        return
    }
	request({
		url: 'https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=cny&baseCurrency=usdt&side=sell&paymentMethod=bank',
	}, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			var sendvalue = "<b>欧易(<code>OKX</code>) 银行卡实时汇率</b>\n\n";
			var allprice = 0
			for (let index = 0; index < 10; index++) {
				const element = JSON.parse(body).data.sell[index];
				sendvalue = `${sendvalue}<code>${index+1}) ${element.price}</code>      <code>${element.nickName}</code>\n`
				allprice+= parseFloat(element.price)

			}
            conf.pool.getConnection(function(err, connection) {
                if (err) return err;
                connection.query(`SELECT * FROM mingyan ORDER BY RAND() LIMIT 1;`,(error, result)=> {
                    connection.destroy();
                    if (error) return error;
                    if (result[0]) {
                        sendvalue =`<a href="${conf.pindaolink}">${result[0].content}\n                   <b>—  黑石担保.</b></a>\n${sendvalue}\n本群费率：0%
本群汇率：实时汇率`
                        // 实时价格（三档）：\n${amount} / ${(allprice/10).toFixed(2)} = ${(amount/(allprice/10)).toFixed(2)}</b>
                        bot.sendMessage(msg.chat.id,sendvalue,{
                            parse_mode:"HTML",
                            disable_web_page_preview:true
                        });
                    }
        
                });
            });
		}
	})
}

function rmbtousdtwx(msg) {
    var amount = msg.text.split("w")[1]
    if (parseInt(amount)<0 || parseInt(amount)%1!=0) {
        return
    }
	request({
		url: 'https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=cny&baseCurrency=usdt&side=sell&paymentMethod=wechat',
	}, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			var sendvalue = "<b>欧易(<code>OKX</code>) 微信实时汇率</b>\n\n";
			var allprice = 0
			for (let index = 0; index < 10; index++) {
				const element = JSON.parse(body).data.sell[index];
				sendvalue = `${sendvalue}<code>${index+1}) ${element.price}</code>      <code>${element.nickName}</code>\n`
				allprice+= parseFloat(element.price)

			}
            conf.pool.getConnection(function(err, connection) {
                if (err) return err;
                connection.query(`SELECT * FROM mingyan ORDER BY RAND() LIMIT 1;`,(error, result)=> {
                    connection.destroy();
                    if (error) return error;
                    if (result[0]) {
                        sendvalue =`<a href="${conf.pindaolink}">${result[0].content}\n                   <b>—  黑石担保.</b></a>\n${sendvalue}\n本群费率：0%
本群汇率：实时汇率`
                        // 实时价格（三档）：\n${amount} / ${(allprice/10).toFixed(2)} = ${(amount/(allprice/10)).toFixed(2)}</b>
                        bot.sendMessage(msg.chat.id,sendvalue,{
                            parse_mode:"HTML",
                            disable_web_page_preview:true
                        });
                    }
        
                });
            });
		}
	})
}

function baobeimuban(msg) {
    bot.sendMessage(msg.chat.id,`<b>公群报备模板</b>

<code>报备金额：xxxx
交易日期：xxxxx
交易内容：xxxxx
交易规则：xxxxx
对接管理：@xxxx
报备人员：@xxxx</code>`,{
        parse_mode:"HTML"
    })
}

function baobeidingdan(msg) {
    var allcontent = msg.text.split("/n")
    var baobeiamount = 0
    var baobeiorderid = `${(-msg.chat.id).toString().substring((-msg.chat.id).toString().length-5,(-msg.chat.id).toString().length)}${msg.from.id.toString().substring(msg.from.id.toString().length-5,msg.from.id.toString().length)}${moment().format("YYYYMMDDHHmmss")}`
    for (let index = 0; index < allcontent.length; index++) {
        if (allcontent[index].search("报备金额：")==0) {
            baobeiamount = allcontent[index].split("报备金额：")[1].match(/\d+/)
        }
    }
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`INSERT INTO baobei (groupid, 	telegramid, nickname, username, amount, content, createtime,orderid,state) VALUES ("${msg.chat.id}", "${msg.from.id}", "${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}", "${(msg.from.username?msg.from.username:"")}", ${baobeiamount}, "${entitiestoUtf16(msg.text)}",now(),"${baobeiorderid}",0);`,(error, result)=> {
            connection.destroy();
            if (error) return error;
            bot.sendMessage(msg.chat.id, `${msg.text}\n\n报备编号：<code>${baobeiorderid}</code>\n报备人员：<a href="http://t.me/${msg.from.username}">${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}</a>`,{
                parse_mode:"HTML",
                disable_web_page_preview:true,
                reply_markup:{
                    inline_keyboard:[
                        [{text:"✅(管理)同意报备",callback_data:`tybb${baobeiorderid}`},{text:"🚫(管理)拒绝报备",callback_data:`jjbb${baobeiorderid}`}],
                        [{text:"⏪(成员)撤回报备",callback_data:`chbb${baobeiorderid}_${msg.from.id}`}],
                    ]
                }
            });

        });
    });
}


function wodebaobei(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where groupid = "${msg.chat.id}" and telegramid = "${msg.from.id}" and state = 1;select sum(amount) from baobei where groupid = "${msg.chat.id}" and telegramid = "${msg.from.id}" and state = 1;`,(error, result)=> {
            connection.destroy();
            if (error) return error;
            var allbaobei = ""
            for (let index = 0; index < result[0].length; index++) {
                allbaobei += `${result[0][index].content}\n<code>dl${result[0][index].orderid}</code>\n\n`;
            }
            bot.sendMessage(msg.chat.id, `${allbaobei}------------------------------------\n<b>个人报备总额：</b><code>${(result[1][0]["sum(amount)"]?result[1][0]["sum(amount)"].toFixed(2):"0.00")}</code>`,{
                parse_mode:"HTML",
                disable_web_page_preview:true,
                reply_to_message_id:msg.message_id
            });

        });
    });
}

function quanbubaobei(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where groupid = "${msg.chat.id}" and state = 1;select sum(amount) from baobei where groupid = "${msg.chat.id}" and state = 1;`,(error, result)=> {
            connection.destroy();
            if (error) return error;
            var allbaobei = ""
            for (let index = 0; index < result[0].length; index++) {
                allbaobei += `${result[0][index].content}\n<code>dl${result[0][index].orderid}</code>\n\n`;
            }
            bot.sendMessage(msg.chat.id, `<b>结账后记得消除此单报备\n管理输入[dl+单号]可销单</b>\n\n${allbaobei}------------------------------------\n<b>群组报备总额：</b><code>${(result[1][0]["sum(amount)"]?result[1][0]["sum(amount)"].toFixed(2):"0.00")}</code>`,{
                parse_mode:"HTML",
                disable_web_page_preview:true,
                reply_to_message_id:msg.message_id
            });

        });
    });
}

function qingchubaobei(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`delete from baobei where groupid = "${msg.chat.id}";`,(error, result)=> {
            connection.destroy();
            if (error) return error;
            bot.sendMessage(msg.chat.id, `<b>✅本群报备数据清空成功</b>`,{
                parse_mode:"HTML",
                disable_web_page_preview:true,
            });

        });
    });
}


function deletebaobei(msg) {
    var orderid = msg.text.split("dl")[1]
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where orderid = "${orderid}" and state = 1;update baobei set state = 2 where orderid = "${orderid}";`,(error, result)=> {
            connection.destroy();
            if (error) return error;
            if (result[0][0]) {
                bot.sendMessage(msg.chat.id, `<b>【<a href="http://t.me/${(msg.from.username?msg.from.username:"")}">${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}</a>】报备已销单，工资已结算</b>\n\n${result[0][0].content}`,{
                    parse_mode:"HTML",
                    disable_web_page_preview:true,
                });
            }else{
                bot.sendMessage(msg.chat.id, `<b>❌报备不存在</b>`,{
                    parse_mode:"HTML",
                    disable_web_page_preview:true,
                });
            }
        });
    });
}

function chazhaobaobei(msg) {
    conf.pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from baobei where orderid = "${msg.text}" and groupid = "${msg.chat.id}";`,(error, result)=> {
            connection.destroy();
            if (error) return error;
            if (result[0]) {
                var state = ""
                if (result[0].state==-2) {
                    state="自助撤回⏪"
                }else if (result[0].state==-1) {
                    state="审核拒绝🚫"
                }else if (result[0].state==0) {
                    state="待审核⌛"
                }else if (result[0].state==1) {
                    state="审核通过✅"
                }else if (result[0].state==2) {
                    state="撤单♻️"
                } 
                bot.sendMessage(msg.chat.id, `<b>来自【<a href="http://t.me/${result[0].username}">${result[0].nickname}</a>】的报备，报备状态：${state}</b>\n\n${result[0].content}\n报备编号：<code>${result[0].orderid}</code>`,{
                    parse_mode:"HTML",
                    disable_web_page_preview:true,
                });
            }else{
                bot.sendMessage(msg.chat.id, `<b>❌报备不存在</b>`,{
                    parse_mode:"HTML",
                    disable_web_page_preview:true,
                });
            }
        });
    });
}

function rmbtousdtzfb(msg) {
    var amount = msg.text.split("z")[1]
    if (parseInt(amount)<0 || parseInt(amount)%1!=0) {
        return
    }
	request({
		url: 'https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=cny&baseCurrency=usdt&side=sell&paymentMethod=alipay',
	}, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			var sendvalue = "<b>欧易(<code>OKX</code>) 支付宝实时汇率</b>\n\n";
			var allprice = 0
			for (let index = 0; index < 10; index++) {
				const element = JSON.parse(body).data.sell[index];
				sendvalue = `${sendvalue}<code>${index+1}) ${element.price}</code>      <code>${element.nickName}</code>\n`
				allprice+= parseFloat(element.price)

			}
            conf.pool.getConnection(function(err, connection) {
                if (err) return err;
                connection.query(`SELECT * FROM mingyan ORDER BY RAND() LIMIT 1;`,(error, result)=> {
                    connection.destroy();
                    if (error) return error;
                    if (result[0]) {
                        sendvalue =`<a href="${conf.pindaolink}">${result[0].content}\n                   <b>—  黑石担保.</b></a>\n${sendvalue}\n本群费率：0%
本群汇率：实时汇率`
                        // 实时价格（三档）：\n${amount} / ${(allprice/10).toFixed(2)} = ${(amount/(allprice/10)).toFixed(2)}
                        bot.sendMessage(msg.chat.id,sendvalue,{
                            parse_mode:"HTML",
                            disable_web_page_preview:true
                        });
                    }
        
                });
            });
		}
	})
}

function checkarray(item,array) {
    for (let index = 0; index < array.length; index++) {
        if (array[index]==item) {
            return true
        }

    }
    return false;
}

function reply_markup(msg) {
    var options = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{ text: '🔔地址监听' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        })
    };

    bot.sendMessage(msg.chat.id, '本机器人支持TRC20链的USDT监听，请点击键盘按钮进行添加', options);
}

function help(msg) {
    var inline_keyboard = []
    if (msg.chat.type=="private") {
        inline_keyboard = conf.inline_keyboard
        conf.pool.getConnection(function(err, connection) {
            if (err) return err;
            connection.query(`select * from users where telegramid = "${msg.from.id}";`,(error, result)=> {
                if (error) return error;
                if (!result[0]) {
                    connection.query(`INSERT INTO users (telegramid,name, username, registertime	) VALUES ( "${msg.from.id}","${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}", "${(msg.from.username?msg.from.username:"未设置用户名")}", now());`,(error, result)=> {
                        if (error) return error;
                        connection.destroy();
                    });
                }else{
                    connection.destroy();
                }
            });
        });
    }
    bot.sendMessage(msg.chat.id,`<b>🛡 <a href="${conf.pindaolink}">专业记账机器人 • (免费)</a>

1.『基础设置』</b>
① 添加机器人进群
② 设置操作人
③ 设置汇率发送 ” 设置汇率6.5 ” 
设置费率/点位发送 ” 设置费率0 “ 

<b>2.『操作指令』</b>
<code>模式</code> 切换记账或工资模式
<code>100u</code>   计算100USDT换算人民币
<code>z100</code>  计算100元人民币换算USDT【支付宝汇率】
<code>w100</code>  计算100元人民币换算USDT【微信汇率】
<code>k100</code>  计算100元人民币换算USDT【银行卡汇率】
<code>设置操作人</code> 设置操作人+回复操作人
<code>移除操作人</code> 移除操作人+回复操作人
<code>下课</code> 开启群禁言
<code>上课</code> 关闭群禁言
<code>帮助</code> 查看操作帮助

<b>3.『记账模式』</b>
<code>+1000</code>  入款1000
<code>-1000</code>  出款1000
<code>清除数据</code> 删除当前账单
<code>账单</code> 查看账单
<code>设置汇率6.8</code> 表示设置u汇率6.8
<code>显示U</code> 打开U显示
<code>隐藏U</code> 关闭U显示

<b>4.『工资模式』 </b>
<code>+100</code> 增加100用户余额+回复用户
<code>-100</code> 减少100用户余额+回复用户
<code>1</code> 查看用户余额【普通用户】
<code>2</code> 查看群内所有用户余额

<b>5.『公群报备』 </b>
<code>报备模板</code> 查看报备模板
<code>我的报备</code> 查看群内所有我发起的审核通过的报备
<code>全部报备</code> 查看群内发起的审核通过的报备
<code>清除报备</code> 删除所有报备
<code>订单编号</code> 查看此订单编号的报备状态
<code>dl</code>+订单编号 结算此订单编号的报备

<b>6.『计算器』 </b>
<code>+ - * /加减乘除符号</code> 支持加减乘除运算，机器人会自动计算结果并发送消息`,{
        parse_mode:"HTML",
        disable_web_page_preview:true,
        reply_markup:{
            inline_keyboard:inline_keyboard
        },
    })
}


function utf16toEntities(str) {
    const patt = /[\ud800-\udbff][\udc00-\udfff]/g; // 检测utf16字符正则
    str = str.replace(patt, (char) => {
      let H;
      let L;
      let code;
      let s;

      if (char.length === 2) {
        H = char.charCodeAt(0); // 取出高位
        L = char.charCodeAt(1); // 取出低位
        code = (H - 0xD800) * 0x400 + 0x10000 + L - 0xDC00; // 转换算法
        s = `&#${code};`;
      } else {
        s = char;
      }

      return s;
    });

    return str;
}

function entitiestoUtf16(strObj) {
    const patt = /&#\d+;/g;
    const arr = strObj.match(patt) || [];

    let H;
    let L;
    let code;

    for (let i = 0; i < arr.length; i += 1) {
      code = arr[i];
      code = code.replace('&#', '').replace(';', '');
      // 高位
      H = Math.floor((code - 0x10000) / 0x400) + 0xD800;
      // 低位
      L = ((code - 0x10000) % 0x400) + 0xDC00;
      code = `&#${code};`;
      const s = String.fromCharCode(H, L);
      strObj = strObj.replace(code, s);
    }
    return strObj;
}

app.get('/getbill',(req,res)=>{ 
    var params = req.query
    conf.pool.getConnection(function(err, connection) {
        connection.query(`select * from groupinfo where  groupid = "${params.groupinfo}";
        select * from jizhang where  groupid = "${params.groupinfo}" and amount > 0 order by id desc;
        select * from jizhang where  groupid = "${params.groupinfo}" and amount < 0 order by id desc;
        select sum(amount) from jizhang where  groupid = "${params.groupinfo}" and amount > 0;
        select sum(amount) from jizhang where  groupid = "${params.groupinfo}" and amount < 0;`,(error, result)=> {
            connection.destroy();
            if (error){
                return
            }
            res.send({
                state:1,
                msg:"success",
                result:{
                    groupinfo:result[0],
                    rubill:result[1],
                    chubill:result[2],
                    zru:(result[3][0]["sum(amount)"]?result[3][0]["sum(amount)"]:0),
                    zchu:(result[4][0]["sum(amount)"]?result[4][0]["sum(amount)"]:0),
                }
            })
        });
    });
})