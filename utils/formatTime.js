exports.formatTimeLeft = function (ms) {
  if (!ms || ms <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  ms %= (1000 * 60 * 60 * 24);

  const hours = Math.floor(ms / (1000 * 60 * 60));
  ms %= (1000 * 60 * 60);

  const minutes = Math.floor(ms / (1000 * 60));
  ms %= (1000 * 60);

  const seconds = Math.floor(ms / 1000);

  return { days, hours, minutes, seconds };
};
