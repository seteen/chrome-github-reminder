console.log('Start background.js');

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (~tab.url.indexOf('github.com')) {
    chrome.pageAction.show(tabId);
  }
});
// 定期実行
chrome.alarms.create({delayInMinutes: 3}); // 起動時だけは、3分で実行する
// chrome.alarms.create({delayInMinutes: 0.1}); // This is for debugging
chrome.alarms.onAlarm.addListener(function() {
  console.log('do!');
  GRStorage.pullRequests().then(function(pullRequests) {
    // closed なPRの削除
    return GRStorage.savePullRequests(pullRequests.filter(function (pr) {
      return !pr.isClosed();
    }));
  }).then(function() {
    return GRStorage.pullRequests();
  }).then(function(pullRequests) {
    // PRのアップデートの確認
    promises = pullRequests.map(function(pr) {
      return Github.getPullRequest(pr).then(function(data) {
        if (PullRequest.isClosed(data)) {
          console.log('delete');
          console.log(pr.url);
          pr.close();
          return GRStorage.savePullRequests(pullRequests);
        } else {
          // console.log(data);
          return pr.compare(data).then(function(result) {
            if (result) {
              console.log('updated');
              console.log(pr.url);
              pr.updated();
              return GRStorage.savePullRequests(pullRequests);
            } else {
              console.log('not updated');
              return Promise.resolve();
            }
          });
        }
      });
    });
    // TODO: これは非同期になっているのでバグあり
    return Promise.all(promises);
  }).then(function() {
    chrome.alarms.create({delayInMinutes: 15});
    // chrome.alarms.create({delayInMinutes: 0.1}); // This is for debugging
  });
});

