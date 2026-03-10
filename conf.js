var mysql = require('mysql');

module.exports = {
    pool: mysql.createPool({
        port:3306, //mysql端口
        user     : 'jizhang', //mysql用户名
        password : 'BKiMA4n2eh4mmSTN', //mysql密码
        database : 'jizhang', //mysql数据库
        multipleStatements: true //不要改这个
    }),
    token: '7947680544:AAG3GPWJDWHM7AM0yQwdh-ifIEhw7pI4vH8', //机器人的token
    inline_keyboard : [ //内联键盘
        [{ text: '➕添加机器人进群➕', callback_data: '5' ,url:"https://t.me/gbjz_bot?startgroup=1"}] ,//更换客服链接
        [{ text: '🔔地址监听', callback_data: '6'}] //更换客服链接
    ],
    pindaolink:"https://t.me/pige11",
    adminid:[276600603,5763088171,5505898689],
    botid:6713735994,
    port:4460,
    mainurl:"http://aq-jizhang-tgbot.aloure-web.top"
}
