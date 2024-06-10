const fs = require('fs');
const axios = require('axios');
const readlineSync = require('readline-sync');
const config = require('./config.json');

const API_KEY = config.api_key;
const API_URL = 'https://api.fastforex.io';
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const conversionsFile = 'conversions.json';

let exchangeRatesCache = {};

const getExchangeRate = async (date, baseCurrency) => {
    if (exchangeRatesCache[baseCurrency]) {
        console.log("USING CHACHE");
        return exchangeRatesCache[baseCurrency];
    }

    const url = `${API_URL}/historical?api_key=${API_KEY}&date=${date}&from=${baseCurrency}`;
    try {
        const response = await axios.get(url);
        exchangeRatesCache[baseCurrency] = response.data;
        return response.data;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
    }
};
const getValidCurrecies = async () => {
    

    const url = `${API_URL}/currencies?api_key=${API_KEY}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
    }
};

const validateDate = (date) => {
    return DATE_FORMAT.test(date);
};

const validateAmount = (amount) => {
    return !isNaN(amount) && parseFloat(amount).toFixed(2) == amount;
};

const validateCurrencyCode = async (code) => {
    const allCurrencies = await getValidCurrecies();
    if(allCurrencies["currencies"][code]!=null){
        return true;
    } else {
        return false;
    }
};

const saveConversion = (conversion) => {
    let conversions = [];
    if (fs.existsSync(conversionsFile)) {
        conversions = JSON.parse(fs.readFileSync(conversionsFile));
    }
    conversions.push(conversion);
    fs.writeFileSync(conversionsFile, JSON.stringify(conversions, null, 2));
};

const main = async () => {
    const date = process.argv[2];
    if (!validateDate(date)) {
        console.log('Invalid date format. Please use YYYY-MM-DD.');
        process.exit(1);
    }

    while (true) {
        let amount = readlineSync.question('Amount: ');
        
        while (!validateAmount(amount)) {
            if (amount.toUpperCase() === 'END') {
                console.log('Exiting the application...');
                process.exit(1);
            }
            console.log('Please enter a valid amount');
            amount = readlineSync.question('Amount: ');
        }

        let baseCurrency = readlineSync.question('Base currency: ');
        while (! await validateCurrencyCode(baseCurrency)) {
            if (baseCurrency.toUpperCase() === 'END' ) {
                console.log('Exiting the application...');
                process.exit(1);
            }
            console.log('Please enter a valid currency code');
            baseCurrency = readlineSync.question('Base currency: ');
        }

        let targetCurrency = readlineSync.question('Target currency: ');
        while (! await validateCurrencyCode(targetCurrency)) {
            if (targetCurrency.toUpperCase() === 'END' ) {
                console.log('Exiting the application...');
                process.exit(1);
            }
            console.log('Please enter a valid currency code');
            targetCurrency = readlineSync.question('Target currency: ');
        }

      

        baseCurrency = baseCurrency.toUpperCase();
        targetCurrency = targetCurrency.toUpperCase();
        amount = parseFloat(amount).toFixed(2);

        const exchangeRates = await getExchangeRate(date, baseCurrency);
        if (!exchangeRates) {
            console.log('Failed to fetch exchange rates. Try again later.');
            continue;
        }
        console.log(exchangeRates);
        const rate = exchangeRates["results"][targetCurrency];
        if (!rate) {
            console.log(`Unable to find exchange rate for ${targetCurrency}.`);
            continue;
        }

        const convertedAmount = (amount * rate).toFixed(2);
        console.log(`${amount} ${baseCurrency} is ${convertedAmount} ${targetCurrency}`);

        const conversion = {
            date,
            amount: parseFloat(amount),
            base_currency: baseCurrency,
            target_currency: targetCurrency,
            converted_amount: parseFloat(convertedAmount)
        };

        saveConversion(conversion);
    }
};

main();
