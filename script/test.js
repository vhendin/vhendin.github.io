(function ($) {
    var ok = function (target, val) {
        if (val === undefined) val = '';
        $('#' + target).html('<div class="status yes">' + val + '</div>');
    }
    var pending = function (target, val) {
        if (val === undefined) val = '';
        $('#' + target).html('<div class="status pending">' + val + '</div>');
    }
    var fail = function (target, val) {
        if (val === undefined) val = '';
        $('#' + target).html('<div class="status no">' + val + '</div>');
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
            ok('TimeoutShort');
        }, 1000);

        pending('TimeoutLong');
        setTimeout(function () {
            ok('TimeoutLong');
        }, 6000);

        var externalScripts = $ !== undefined;

        if (externalScripts) {
            ok('ExternalScripts');

            pending('AJAX');

            $.get('https://randomuser.me/api/')
                .done(function (response) {
                    ok('AJAX');
                })
                .fail(function (error) {
                    fail('AJAX');
                    console.error(error);
                });

            setTimeout(function () {
                pending('AJAXDelay');

                $.get('https://randomuser.me/api/')
                .done(function (response) {
                    ok('AJAXDelay');
                })
                .fail(function (error) {
                    fail('AJAXDelay');
                    console.error(error);
                });
            }, 6000)
        }

        try {
            pending('XMLHttpRequest')

            var xhr = new XMLHttpRequest();

            xhr.open('GET', 'https://randomuser.me/api/', true);

            xhr.onload = function (e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        ok('XMLHttpRequest')
                    } else {
                        console.error(xhr.statusText);
                        fail('XMLHttpRequest')
                    }
                }
            };
            xhr.onerror = function (e) {
                console.error(xhr.statusText);
                fail('XMLHttpRequest')
            };

            xhr.send();
        } catch (error) {
            fail('XMLHttpRequest');
        }

        $('#jQueryClick').click(function () {
            ok('OnClickJQ');
        });
    }

    init();
})($)