(function (axios) {
            var ok = function (target, val = '') {
                document.getElementById(target).innerHTML = '<div class="status yes">'+val+'</div>';
            }
            var init = function () {
                var i = 1;

                ok('JavaScript');

                setInterval(function () {
                    ok('Interval', i);
                    i++;
                }, 1000);

                setTimeout(function () {
                    ok('TimeoutShort')
                }, 1000);

                setTimeout(function () {
                    ok('TimeoutLong')
                }, 6000);

                var externalScripts = axios !== undefined;

                if (externalScripts) {
                    ok('ExternalScripts')

                    var then = new Date().getTime();

                    axios.get('https://randomuser.me/api/')
                        .then(function (response) {
                            var now = new Date().getTime()
                            ok('AJAX')
                        }).catch(function (error) {
                            console.error('Error fetching data:', error)
                        })
                }

                var xhr = new XMLHttpRequest();

                var xmlThen = new Date().getTime();

                xhr.open('GET', 'https://randomuser.me/api/', true);

                xhr.onload = function (e) {
                    var xmlNow = new Date().getTime();
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            ok('XMLHttpRequest')
                        } else {
                            console.error(xhr.statusText);
                        }
                    }
                };
                xhr.onerror = function (e) {
                    console.error(xhr.statusText);
                };

                xhr.send();
            }

            init();
        })(axios)