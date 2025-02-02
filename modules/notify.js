const notificationQueue = [];

export function notify(args) {
  if (!args?.message || !args?.timeout) {
    console.error("invalid notification args");
    return;
  }

  const notification = args?.message;
  const timeout = args?.timeout;

  notificationQueue.push({ notification, timeout });

  if (notificationQueue.length === 1) {
    displayNextNotification();
  }
}

function displayNextNotification() {
  if (notificationQueue.length === 0) {
    return;
  }

  const { notification, timeout } = notificationQueue[0];
  console.log("Displaying notification:", notification);

  var notificationElem = document.getElementById("notification");
  notificationElem.textContent = notification;
  notificationElem.classList.add("activate");

  setTimeout(() => {
    notificationElem.classList.remove("activate");

    setTimeout(() => {
      notificationQueue.shift();
      displayNextNotification();
    }, 500);
  }, timeout * 1000);
}

/*
window.addEventListener("DOMContentLoaded", () => {
  // Example usage
  notify("Achievement 1 Unlocked", 3);
  notify("Achievement 2 Unlocked", 5);
  notify("Achievement 3 Unlocked", 2);
});
*/
