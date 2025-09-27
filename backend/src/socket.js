// set/get the io instance to avoid circular requires
let ioInstance = null;

module.exports = {
  setIo: (io) => { ioInstance = io; },
  getIo: () => ioInstance
};
