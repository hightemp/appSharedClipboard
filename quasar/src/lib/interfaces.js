
var os = require('os');

export default function fnGetAllIPsFromAllInterfaces()
{
  var aResult = [];
  try {
    var oIfaces = os.networkInterfaces();

    Object.keys(oIfaces).forEach((sIfaceName) => {
      oIfaces[sIfaceName].forEach((oIface) => {
        aResult.push(oIface.address);
      });
    });
  } catch(_) {
    console.error(_);
  }
  return aResult;
}

/*
var aIPs = fnGetAllIPsFromAllInterfaces();

// console.log(aIPs);

*/