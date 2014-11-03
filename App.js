Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    _users:[],
    launch: function() {
        var millisecondsInDay = 86400000;
        var currentDate = new Date();
        var startDate = (new Date(currentDate - millisecondsInDay*180)).toISOString(); //in the last 180 days
        var that = this;
        var users = Ext.create('Rally.data.wsapi.Store', {
            model: 'User',
            fetch: ['UserName','RevisionHistory','Revisions','User'],
            limit: Infinity,
            autoLoad: true,
            filters: [
               {
                   property: 'CreationDate',
                   operator: '>=',
                   value: startDate
               }
            ]
        });
        users.load().then({
            success: this._getRevHistoryModel,
            scope: this
        }).then({
            success: this._onRevHistoryModelCreated,
            scope: this
        }).then({
            success: this._onModelLoaded,
            scope: this
        }).then({
            success: this._stitchDataTogether,
            scope: this
        }).then({
            success:function(results) {
                that._makeGrid(results);
            },
            failure: function(){
                console.log("oh noes!");
            }
        });
    },
    _getRevHistoryModel:function(users){
        this._users = users;
        return Rally.data.ModelFactory.getModel({
            type: 'RevisionHistory'
        });
    },
  _onRevHistoryModelCreated: function(model) {
    var that = this;
    var promises = [];
    _.each(this._users, function(user){
      var ref = user.get('RevisionHistory')._ref;
      console.log(user.get('UserName'), ref);
        promises.push(model.load(Rally.util.Ref.getOidFromRef(ref)));
    }); 
    return Deft.Promise.all(promises);  
   },
    
    _onModelLoaded: function(histories) {
      var promises = [];
      _.each(histories, function(history){
        var revisions = history.get('Revisions');
        revisions.store = history.getCollection('Revisions',{fetch:['User','CreationDate','Description']});
        promises.push(revisions.store.load());
      });
      return Deft.Promise.all(promises);  
    },
    _stitchDataTogether:function(revhistories){
      var that = this;
      var usersWithRevs = [];
      _.each(that._users, function(user){
        usersWithRevs.push({user: user.data});
      });
      var i = 0;
      _.each(revhistories, function(revisions){
        var originalRev = _.last(revisions).data;
        usersWithRevs[i].originalRevision = originalRev;
        i++;
      });
      return usersWithRevs;

    },

    _makeGrid: function(usersWithRevs){
      console.log(usersWithRevs);
      this.add({
            xtype: 'rallygrid',
            showPagingToolbar: true,
            showRowActionsColumn: false,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: usersWithRevs
            }),
            columnCfgs: [
                {
                    text: 'UserName',dataIndex: 'user', minWidth:200,
                    renderer:function(value){
                        return value.UserName;
                    }
                },
                {
                    text: 'Created by',dataIndex: 'originalRevision', minWidth:200,
                    renderer:function(value){
                        return value.User._refObjectName;
                    }
                },
                {
                    text: 'Created on',dataIndex: 'originalRevision', minWidth:200,
                    renderer:function(value){
                        return value.CreationDate;
                    }
                }
            ]
        });
        
    }
    
});

