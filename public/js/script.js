// --------- NUMBER FORMATTING AND CURRENT DATE -----------------------------------------------------------------------
const usCurrencyFormat = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}); // usCurrencyFormat.format(num)
const percentFormat = new Intl.NumberFormat("en-US",{style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2});

var today = new Date();
var day = today.getDate();
var month = today.getMonth();
var year = today.getFullYear();
const dateToday = (month + "/" + day + "/" + year);

// ----- GET PRICE OF A CRYPTO -------------------------------------------
let wantedPrice = 0.0; 
function getPrice(wantedTicker){
    var burl = "https://api.binance.com";
    var query = '/api/v1/ticker/24hr';
    query += `?symbol=${wantedTicker}USDT`; 
    var url = burl + query;
    var ourRequest = new XMLHttpRequest();

    ourRequest.open('GET',url,false); // false = synchronous which is causing delay. true = asynchronous, but i couldn't figure out how to not return undefined with asynchronous
    ourRequest.onload = function(){
        // console.log(ourRequest.responseText);
        let stockObject = JSON.parse(ourRequest.responseText);
        price = parseFloat(stockObject.lastPrice);
        wantedPrice = price;
    }
    ourRequest.send();
    return wantedPrice;
}
let percentChange = 0.0;
function getPercentChange(wantedTicker){
    var burl = "https://api.binance.com";
    var query = '/api/v1/ticker/24hr';
    query += `?symbol=${wantedTicker}USDT`; // 
    var url = burl + query;
    var ourRequest = new XMLHttpRequest();

    ourRequest.open('GET',url,false); // false = synchronous which is causing delay. true = asynchronous, but i couldn't figure out how to not return undefined with asynchronous
    ourRequest.onload = function(){
        // console.log(ourRequest.responseText);
        let stockObject = JSON.parse(ourRequest.responseText);
        percentChange = parseFloat(stockObject.priceChangePercent);
    }
    ourRequest.send();
    return percentChange;
}

// --------- SELL POSITIONS -------------------------------------------------------------------
const sellPosition = (desiredPositionItem) => {
    const messagesRef = firebase.database().ref();
    messagesRef.on('value', (snapshot) => {
        data = snapshot.val();
        //console.log(data);
    });
    for(const positionItem in data) {
        const position = data[positionItem];
        if (positionItem == desiredPositionItem){
            const amountSell = prompt("How many coins would you like to sell?");
            if (amountSell > 0 && amountSell < position.amount){ //to filter out canceled out sell orders
                // user wants to sell part
                const oldAmount = parseFloat(position.amount);
                const positionEdit = {
                    coin: position.coin,
                    price: position.price,
                    amount: (oldAmount - amountSell),
                }
                firebase.database().ref(positionItem).update(positionEdit);
                //create a new datapoint in firebase
                firebase.database().ref().push({
                    coin: position.coin,
                    price: getPrice(position.coin),
                    buyAmount: position.buyAmount,
                    amount: amountSell,
                    status: "out",
                    direction: "sell",
                    date: dateToday,
                    watch: false
                })
                updateInvested(); //update the amount invested number shown on screen
            }
            else if (amountSell == position.amount) {
                // user wants to sell all
                // firebase.database().ref(positionItem).remove();
                const positionEdit = { //update old position
                    status: "out"
                }
                firebase.database().ref(positionItem).update(positionEdit);
                firebase.database().ref().push({
                    coin: position.coin,
                    price: getPrice(position.coin),
                    amount: amountSell,
                    buyAmount: position.buyAmount,
                    status: "out",
                    direction: "sell",
                    date: dateToday,
                    watch: false
                })
                updateInvested();
            }
            else {
                // user has cancelled sell order
            }
        }
  };
}

// --------- CURRENT POSITIONS -------------------------------------------------------------------
window.onload = (event) => {
    setTimeout(() => {
        getPositions(); //delay so porfolio can be valued at current crypto prices (takes a second to get this data)
        getSortedPositions();
    }, 2000); 
    displayWatch();
};

let data = ``;
const getPositions = () => {
    var dbRef = firebase.database().ref();
    dbRef.orderByChild("coin").on('value', (snapshot) => { 
        data = snapshot.val();
        // console.log(data);
        renderDataAsHtml(data);
    });
}

const getSortedPositions = () => {
    var dbRef = firebase.database().ref();
    dbRef.orderByChild("coin").on("child_added", snap => {
        // console.log(snap.val());
    });
}

let cards = ``;
let orderHistory = ``;
let positions = [];
let porfolioValue = 0; // this is actually amount invested
let porfolioWorth = 0;
let tickers = ["exampleTicker"];
const renderDataAsHtml = (data) => {
    cards = ``;
    orderHistory = ``;
    for(const positionItem in data) {
        const position = data[positionItem];
        let ticker = position.coin;
        // console.log(ticker);
        if (position.status == "in"){
            cards += createCard(position, positionItem) // For each position create an HTML card
            tickers.push(ticker);
            positions.push(position);
            let positionValue = (position.amount)*(position.price);
            porfolioValue += positionValue;
            porfolioWorth += ((position.amount)*(getPrice(position.coin)));
        }
        else if (position.status == "in" || position.status == "out"){
            orderHistory += createOrder(position, positionItem) // For each position create an HTML card
        }
  };
  document.querySelector('#app').innerHTML = cards;
  document.querySelector('#appHistory').innerHTML = orderHistory;
  getBalance();
};

const createCard = (position, positionItem) => {
    let innerHTML = "";
    innerHTML += `<div class="card">`
    innerHTML += `<header class="card-header">`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${position.coin} (${position.amount})`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    let gain = (((position.amount)*(getPrice(position.coin))) - (position.amount)*((position.price)));
    let gainSymbol = "";
    if (gain >= 0){ gainSymbol = "+";}
    innerHTML += `${usCurrencyFormat.format(getPrice(position.coin))} (${percentFormat.format((getPercentChange(position.coin))/100)})`
    innerHTML += `</p>`
    innerHTML += `<button class="card-header-icon" aria-label="more options" id="${positionItem}" onclick="sellPosition(this.id)">`
    innerHTML += `Sell`
    innerHTML += `</button>`
    innerHTML += `</header>`
    innerHTML += `</div>`
    return innerHTML;
};

const createOrder = (position, positionItem) => {
    let innerHTML = "";
    innerHTML += `<div class="card">`
    innerHTML += `<header class="card-header">`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${position.date}`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${position.coin}`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${position.direction}`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    let shownAmount = position.amount
    if (position.status == "in"){shownAmount = position.buyAmount;}
    innerHTML += `${shownAmount}`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${usCurrencyFormat.format(position.price)}`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${usCurrencyFormat.format(shownAmount*(position.price))}`
    innerHTML += `</p>`
    innerHTML += `</header>`
    innerHTML += `</div>`    
    return innerHTML;
}

// --------- PORTFOLIO BALANCE -------------------------------------------------------------------
let valueElement = document.getElementById('value');
let gainElement = document.getElementById('gain');
let investElement = document.getElementById('invested');
let cashElement = document.getElementById('cash');
let invested;
let cash;

const getBalance = () => {
    invested = porfolioValue;
    cash = 100000 - invested;
    investElement.innerText = usCurrencyFormat.format(invested);
    cashElement.innerText = usCurrencyFormat.format(cash);
    createPieChart(invested, cash);
    // console.log("Portfolio worth");
    // console.log(porfolioWorth + cash);
    let gain = (porfolioWorth - porfolioValue);
    let gainSymbol = "";
    if (gain >= 0){
        gainSymbol = "+";
    }
    valueElement.innerText = (usCurrencyFormat.format((porfolioWorth + cash)));
    gainElement.innerText = (`${gainSymbol + usCurrencyFormat.format(gain)} (${gainSymbol + percentFormat.format(gain/100000)}) Total`);
}

const updateInvested = () => {
    porfolioValue = 0;
    porfolioWorth = 0;
    const messagesRef = firebase.database().ref();
    messagesRef.on('value', (snapshot) => {
        data = snapshot.val();
        // console.log(data);
    });

    for(const positionItem in data) {
        const position = data[positionItem];
        if (position.status == "in"){
            let positionValue = (position.amount)*(position.price);
            porfolioValue += positionValue;
            porfolioWorth += ((position.amount)*(getPrice(position.coin)));
        } 
    };
    // console.log("NEW PORTFOLIO VALUE");
    // console.log(porfolioValue);
    cash = 100000 - porfolioValue;
    investElement.innerText = usCurrencyFormat.format(porfolioValue);
    cashElement.innerText = usCurrencyFormat.format(cash);
    createPieChart(porfolioValue, cash);
    
    // console.log("Portfolio worth");
    // console.log(porfolioWorth + cash);

    let gain = (porfolioWorth - porfolioValue);
    let gainSymbol = "";
    if (gain >= 0){
        gainSymbol = "+";
    }

    valueElement.innerText = (usCurrencyFormat.format((porfolioWorth + cash)));
    gainElement.innerText = (`${gainSymbol + usCurrencyFormat.format(gain)} (${gainSymbol + percentFormat.format(gain/100000)}) Total`);
    
}

// ------ Pi Chart ---------------------
const createPieChart = (invested, cash) => {
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawChart);
    // Draw the chart and set the chart values
    function drawChart() {
        var data = google.visualization.arrayToDataTable([
            ['Distripution', 'Percent'],
            ['Invested', invested],
            ['Cash', cash]
        ]);
        var options = {'legend': 'none'}; //remove legend
        // Display the chart inside the <div> element with id="piechart"
        var chart = new google.visualization.PieChart(document.getElementById('piechart'));
        chart.draw(data, options);
    }
}


// -------- USE FOR SEARCH PAGE --------------------------------------------------------------
// -------- BUY POSITIONS --------------------------------------------------------------------
const buyEth = (coinName) => {
    const buyAmount = prompt("How many coins would you like to buy?");
    console.log("running");
    const lotSize = parseFloat(buyAmount);
    const coinPrice = getPrice(coinName);
    
    console.log({
    price: coinPrice,
    amount: lotSize
    }); 

    if (tickers.includes(coinName)){ //see if there is a current position
        console.log("you already have a position in this crypto.");
        //update the current position
        updateCurrentPosition(coinPrice, lotSize, coinName);
        //need to add new data point
        // createOrderHistoryPoint(coinPrice, lotSize, coinName);
        // firebase.database().ref().push({
        //     coin: coinName,
        //     price: ((((parseFloat(position.price))*(parseFloat(position.amount))) + (newPrice*newAmount))/(parseFloat(position.amount) + newAmount)),
        //     amount: parseFloat(position.amount) + newAmount,
        //     buyAmount: newAmount,
        //     status: "in",
        //     direction: "buy",
        //     date: dateToday
        // })
    }
    else {
        console.log("you are entering a new position.");
        //create a new position in firebase
        firebase.database().ref().push({
            coin: coinName,
            price: coinPrice,
            amount: lotSize,
            buyAmount: lotSize,
            status: "in",
            direction: "buy",
            date: dateToday,
            watch: false
        })
    }
    updateInvested(); //update the amount invested number shown on screen
}



const updateCurrentPosition = (newPrice, newAmount, coinName) => {
    // let count = 0;
    for(const positionItem in data) {
        const position = data[positionItem];
        let ticker = position.coin;
        console.log(ticker);
        if (ticker == coinName){
            console.log("match");
            const oldAmount = parseFloat(position.amount);
            const oldPrice = parseFloat(position.price);
            const positionEdit = {
                coin: coinName,
                price: ((((oldPrice)*(oldAmount)) + (newPrice*newAmount))/(oldAmount + newAmount)),
                amount: oldAmount + newAmount,
                // buyAmount: newAmount,
                // status: "in",
                // direction: "buy",
                // date: dateToday                
            }
            // firebase.database().ref(positionItem).update(positionEdit);
            console.log("you are creating a new orderhistory point.");
            //create a new datapoint in firebase
            firebase.database().ref().push({
                coin: coinName,
                price: ((((oldPrice)*(oldAmount)) + (newPrice*newAmount))/(oldAmount + newAmount)),
                amount: oldAmount + newAmount,
                buyAmount: newAmount,
                status: "in",
                direction: "buy",
                date: dateToday,
                watch: false
            })
            // if (count < 1){
            //     firebase.database().ref().push({
            //         coin: coinName,
            //         price: ((((oldPrice)*(oldAmount)) + (newPrice*newAmount))/(oldAmount + newAmount)),
            //         amount: oldAmount + newAmount,
            //         buyAmount: newAmount,
            //         status: "in",
            //         direction: "buy",
            //         date: dateToday,
            //         watch: false
            //     })
            //     count++;
            // }
            firebase.database().ref(positionItem).update(positionEdit);
        }
    }

    const createOrderHistoryPoint = (newPrice, newAmount, coinName) => {
        for(const positionItem in data) {
        const position = data[positionItem];
            const oldAmount = parseFloat(position.amount);
            const oldPrice = parseFloat(position.price);
            firebase.database().ref().push({
                coin: coinName,
                price: ((((oldPrice)*(oldAmount)) + (newPrice*newAmount))/(oldAmount + newAmount)),
                amount: oldAmount + newAmount,
                buyAmount: newAmount,
                status: "in",
                direction: "buy",
                date: dateToday,
                watch: false
            })
        }
    }

    // firebase.database().ref().push({
    //     coin: coinName,
    //     price: ((((parseFloat(position.price))*(parseFloat(position.amount))) + (newPrice*newAmount))/(parseFloat(position.amount) + newAmount)),
    //     amount: parseFloat(position.amount) + newAmount,
    //     buyAmount: newAmount,
    //     status: "in",
    //     direction: "buy",
    //     date: dateToday
    // })
}

// const testing = (name) => {
//     console.log(NamedNodeMap);
// }

// search function
const startSearch = () => {
    const searchInput = document.querySelector('#search').value;
    let url = "https://api.binance.com/api/v1/ticker/24hr";

    fetch(url)
    .then(response => response.json()) // read JSON response
    .then(myjson => {
        console.log("finding coin");
    const results = document.querySelector('#results');
    results.innerHTML = "";
    for(coinElement in myjson) {
        const coinData = myjson[coinElement];
        const ticker = `${searchInput}USDT`;
        if (ticker === coinData.symbol){
            results.innerHTML += `<div class="card">
                            <header class="card-header">
                                <p class="card-header-title ">
                                ${searchInput}
                                </p>
                                <p class="card-header-title ">
                                $${getPrice(searchInput)}
                                </p>
                                <button class="card-header-icon" aria-label="more options" onclick="buyEth('${searchInput}')">
                                Buy
                                </button>
                                <button class="card-header-icon" aria-label="more options" onclick="addCoin(${getPrice(searchInput)}, '${searchInput}')">
                                Add
                                </button>
                            </header>
                        </div>`;
        }
    }
    })
    .catch(error => {
      console.log(error); // Log error if there is one
    })
};

// //buy positions
// const buyPosition = (desiredPositionItem) => {
//     const messagesRef = firebase.database().ref();
//     messagesRef.on('value', (snapshot) => {
//         data = snapshot.val();
//         console.log(data);
//     });
//     for(const positionItem in data) {
//         const position = data[positionItem];
//         if (positionItem == desiredPositionItem){
//             const amountBuy = prompt("How many coins would you like to buy?");
//             if (amountBuy > 0 && amountBuy < position.amount){ //to filter out canceled out buy orders
//                 console.log("user wants to buy part");
//                 const oldAmount = parseFloat(position.amount);
//                 const positionEdit = {
//                     coin: position.coin,
//                     price: position.price,
//                     amount: (oldAmount + amountBuy),
//                 }
//                 firebase.database().ref(positionItem).update(positionEdit);
//                 console.log("you are creating a new orderhistory point.");
//                 //create a new datapoint in firebase
//                 firebase.database().ref().push({
//                     coin: position.coin,
//                     price: getPrice(position.coin),
//                     buyAmount: position.buyAmount,
//                     amount: amountBuy,
//                     status: "out",
//                     direction: "buy",
//                     date: dateToday
//                 })
//                 updateInvested(); //update the amount invested number shown on screen
//             }
//             else {
//                 console.log("user has cancelled buy order");
//             }
//         }

//   };

// }

// window.onload = (event) => {
//     displayWatch();
// }

const displayWatch = () => {
    const watchRef = firebase.database().ref('watched');
    watchRef.on('value', (snapshot) => {
        data = snapshot.val();
        console.log(data);
        console.log("watchlist running");
        let cards = ``;
        for (const positionItem in data){
            const position = data[positionItem];
            cards += `<div class="card">
                            <header class="card-header">
                                <p class="card-header-title ">
                                ${position.coinName}
                                </p>
                                <p class="card-header-title ">
                                $${getPrice(position.coinName)}
                                </p>
                                <button class="card-header-icon" aria-label="more options" onclick="buyEth('${position.coinName}')">
                                Buy
                                </button>
                            </header>
                        </div>`;
        }
        const watchId = document.querySelector("#watch");
        console.log(cards);
        watchId.innerHTML = cards;
    });
};

//add to watchlist
const addCoin = (coinPrice, coinName) => {
    const watchRef = firebase.database().ref('watched');
    watchRef.on('value', (snapshot) => {
        data = snapshot.val();
        let isWatched = false;
        for (const positionItem in data){
            const position = data[positionItem];
            if (position.coinName === coinName){
                isWatched = true;
            }
        }
        if (!isWatched){
            firebase.database().ref('watched').push({
                coinName: coinName,
                coinPrice: coinPrice,
                watch: true
            });
        }
    });
};
