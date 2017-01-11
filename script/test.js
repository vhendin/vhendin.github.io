(function (axios, $) {
    var ok = function (target, val = '') {
        $('#' + target).html('<div class="status yes">' + val + '</div>')
    }
    var pending = function (target, val = '') {
        $('#' + target).html('<div class="status pending">' + val + '</div>')
    }
    var fail = function (target, val = '') {
        $('#' + target).html('<div class="status no">' + val + '</div>')
    }
    var init = function () {
        var i = 1;

        ok('JavaScript');

        pending('Interval');
        setInterval(function () {
            ok('Interval', i);
            i++;
        }, 1000);

        pending('TimeoutShort');
        setTimeout(function () {
            ok('TimeoutShort')
        }, 1000);

        pending('TimeoutLong');
        setTimeout(function () {
            ok('TimeoutLong')
        }, 6000);

        var externalScripts = axios !== undefined;

        if (externalScripts) {
            ok('ExternalScripts')

            var then = new Date().getTime();
            pending('AJAX')
            axios.get('https://randomuser.me/api/')
                .then(function (response) {
                    var now = new Date().getTime()
                    ok('AJAX')
                }).catch(function (error) {
                    console.error('Error fetching data:', error)
                })
        }

        try {
            pending('XMLHttpRequest')

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
        } catch (error) {
            fail('XMLHttpRequest')
        }
    }

    init();
})(axios, $)