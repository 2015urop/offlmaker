function makeTitleEditable(){
    $(document).bind("enterKey", function (e) {
        $('.highcharts-title tspan').html($('#inputTitle').val());
        Highcharts.charts[0].options.title.text = $('#inputTitle').val();
        $('#inputTitle').remove();
    });

    $(document).keyup(function (e) {
        if (e.keyCode == 13) {
            $(this).trigger("enterKey");
        }
    });

    $('.highcharts-title').click(function () {
        $('.highcharts-container').css('text-align','center');
        $('.highcharts-container').prepend('<input type="text" id="inputTitle" style="visibility: hidden; z-index:10;"/>');
        $('#inputTitle').val($('.highcharts-title tspan').html());
        $('.highcharts-title tspan').html("");
        $('#inputTitle').css("visibility", "visible");
        $('#inputTitle').focus();
    });
}