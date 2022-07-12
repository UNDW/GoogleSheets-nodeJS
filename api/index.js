const express = require('express');

const { google } = require('googleapis');

const app = express(),
  bodyParser = require('body-parser');
port = 3080;

app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});

// post

app.post('/api/form', async (req, res) => {
  const { manager, dateStart, dateEnd } = req.body;
  // Начало таблицы
  const sheetsSettings = async (key, id, ranges) => {
    const auth = new google.auth.GoogleAuth({
      keyFile: key,
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const client = await auth.getClient();

    const googleSheets = google.sheets({
      version: 'v4',
      auth: client,
    });
    const spreadsheetId = id;

    // читаем строки из таблицы
    const getRows = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: ranges,
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    return getRows.data.values;
  };

  // Важно указать верный Range таблице которую мы используем!
  const rowsDataLeads = await sheetsSettings(
    'credentials-sheets-leads.json',
    '1QwiEqpDffuvW7Agu-LfXueQ_FbZrvlgjuF76aTHXoPM',
    'Апрель!A2:O'
  );

  // изменяем строку даты
  const year = "2022-";
  let dateTransform = function reverseStr(num) {
    return year.concat(num.split(".").reverse().join("-"));
  };

  // функции для таблицы Leads
  const converArraytoJson = (arr) => {
    return {
      date: dateTransform(arr[1]),
      userName: arr[0],
      сhannel: arr[2],
      announcement: arr[3],
      manager: arr[4],
      state: arr[5],
      targetAudience: arr[6],
      order: arr[9],
      done: arr[10],
      orderNumber: arr[11],
    };
  };

  // Функция фильтра стартового массива, мы используем ее и в Order и в Lead
  jsonArray = (rowsData, converArray) => {
      return rowsData.filter((arr) => !!arr[0])
        .map((arr) => {
          return converArray(arr)
      })
  };

  const jsonArrayLeads = jsonArray(rowsDataLeads, converArraytoJson);

  // Функция фильтра по менеджеру, мы используем ее и в Order и в Lead
  const getByManager = (manager, arr) => {
    return arr.filter((Object) => manager === Object.manager);
  };

  const managerArr = getByManager(manager, jsonArrayLeads);

  const dateS = new Date(dateStart);
  const dateE = new Date(dateEnd);
  const getByDate = (arr, dateS, dateE) => {
    return arr.filter(
      (object) =>
        new Date(object.date) >= dateS && new Date(object.date) <= dateE
    );
  };

  const dateSE = getByDate(managerArr, dateS, dateE);

  const getByTargetAudience = (arr) => {
    return arr.filter((el) => el.targetAudience === 'Да');
  };

  const getTargetAudience = getByTargetAudience(dateSE);

  const getByOrder = (arr) => {
    return arr.filter((el) => el.order == 'Да');
  };
  const getOrder = getByOrder(getTargetAudience);

  const getByDone = (arr) => {
    return arr.filter((el) => el.done == 'Да');
  };
  const getDone = getByDone(getOrder);

  // -------------------------------------------------------------------
  // функции для таблицы Leads

  // Функции для таблицы Order
  // Важно указать верный Range таблице которую мы используем!
  const rowsDataOrder = await sheetsSettings(
    'credentials-sheets-order.json',
    '1FsKla3lGLybW_KHqmgUdyaccjjrvkBNFI5TIfvCdlbM',
    'Апрель!A4:AE'
  );

  const converArraytoJsonOrder = (arr) => {
    return {
      date: dateTransform(arr[1]),
      numberOfOrder: arr[0],
      userName: arr[5],
      channel: arr[6],
      announcement: arr[7],
      manager: arr[4],
      state: arr[3],
      total: arr[13],
    };
  };

  // Функция фильтра стартового массива Order
  const jsonArrayOrder = jsonArray(rowsDataOrder, converArraytoJsonOrder);

  // функция для фильтра по менеджеру Order
  const managerOrder = getByManager(manager, jsonArrayOrder);

  const orderNumbers = (
    dateSE
      .filter((el) => !!el.orderNumber)
      .map((el) => el.orderNumber)
    );

  // функция для статуса
  const orderState = (arr) => {
    return arr.filter(
      (object) =>
        object.state === 'получен' ||
        object.state === 'отгружен' ||
        object.state === 'подтвержден' ||
        object.state === 'производство'
    );
  };

  const orders = (
    orderState(managerOrder)
      .map((order) => orderNumbers.some((el) => el === order.numberOfOrder) && order)
      .filter((el) => !!el.numberOfOrder));

  // Функция для сумирования
  let sum = 0;
  
  for (let i = 0; i < orders.length; i++) {
    sum += Number(orders[i].total.replace(/\s+/g, ''));
  };
 
  // Функции для таблицы Order
  const count = [
    `Таблица - Leads`,
    `Показаны результаты менеджера ${manager}`,
    `Отчет за данную дату: ${dateStart}-${dateEnd}`,
    `Количество клиентов у менеджера за выбранную дату - ${dateSE.length}`,
    `Количество ЦА - ${getTargetAudience.length
    }, процент ЦА от всех заказов ${Math.ceil(
      (getTargetAudience.length / dateSE.length) * 100
    )}%`,
    `Сколько было всего заказано у менеджера - ${getOrder.length
    }, сколько сделали заказов от ЦА - ${Math.ceil(
      (getOrder.length / getTargetAudience.length) * 100
    )}%`,
    `Сколько завершенных заказов у менеджера - ${getDone.length
    }, процент завершенных заказов от полученных ${Math.ceil(
      (getDone.length / getOrder.length) * 100
    )}%`,
    `Таблица - Заказы своя, по дефолту указан фильтр на статус заказа - получен,отгружен,подтвержден`,
    `Сколько у менеджера заказов получен,отгружен,подтвержден, производство - ${orders.length}`,
    `Средний чек у менеджера за выбранную дату - ${Math.ceil(
      sum / orders.length
    )}`,
    `Общая сумма всех продаж менеджера - ${sum}`,
  ];

  res.json(count);
});

app.listen(port, (req, res) => console.log(`running on ${port}`));