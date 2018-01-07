// Save button
$('.save').on('click', function() {
    var articleId = $(this).attr('data-id');
    $.ajax({
        method: 'POST',
        url: '/articles/saved/' + articleId
    }).done(function(data){
        window.location = '/'
    });
});

// Delete button
$('.delete').on('click', function() {
    var articleId = $(this).attr('data-id');
    $.ajax({
        method: 'POST',
        url: '/articles/delete/' + articleId
    }).done(function(data) {
        window.location = '/saved'
    });
});

// Scrape articles button
$('.scrape').on('click', function() {
    $.ajax({
        method: 'GET',
        url: '/scrape',
    }).done(function(data) {
        console.log(data)
        window.location = '/'
    });
});