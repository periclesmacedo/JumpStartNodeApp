$(document).ready(function(){
  $('#add-stock').click(function(e){
    $.ajax({type: 'POST',
      url: '/add-stock/',
      data: {stock: $('#stock').val()}
    }).done(function(price){
      $('.stock-list').append('<tr><td>' + $('#stock').val() + 
        '</td><td>' + price + '</td></tr>');
    });
  });

  var PortfolioView = Backbone.View.extend({

    el: 'body',

    events: {
      'click .add-filter' : 'filter'
    },

    initialize: function(){
      window.portfolioCollection = new PortfolioCollection();
      var self = this;
      window.portfolioCollection.fetch({
        success: function(){
          self.render();
        },

        error: function(){
          console.log('error fetchind data for portfolio');
        }
      });
    },

    render: function(){
      for(var i = 0; i < window.portfolioCollection.models.length; i++){
        var data = window.portfolioCollection.models[i];
        var rowView = new RowView({model: data});
        $('.stock-list').append(rowView.render().el);
      }
    },

    filter: function(){
      var filterString = $('#filter').val();
      var data = window.portfolioCollection.models;
      for(var i = 0; i < data.length; i++){
        if(data[i].toJSON().stock.toLowerCase().
           indexOf(filterString.toLowerCase()) == -1){
          data[i].setVisible(false);
        }
        else 
          data[i].setVisible(true);
      }
    }
  });

  var PortfolioModel = Backbone.Model.extend({
    default: {
      visible: true
    },

    setVisible: function(visible){
      this.set({visible: visible});
    }
  });

  var PortfolioCollection = Backbone.Collection.extend({
    model: PortfolioModel,
    url: '/portfolio'
  });

  var RowView = Backbone.View.extend({
    tagName: 'tr',

    initialize: function(){
      _.bindAll(this, 'setVisibility');
      this.model.bind('change', this.setVisibility);
    },

    render: function(){
      var template = 
        _.template("<td><%=stock%></td><td><%=price%></td>");
      $(this.el).html(template(this.model.toJSON()));
      return this;
    },

    setVisibility: function(){
      if(!this.model.toJSON().visible)
        $(this.el).hide();
      else
        $(this.el).show();
    }
  });

  new PortfolioView();
});
