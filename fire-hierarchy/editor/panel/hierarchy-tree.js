﻿Polymer({
    created: function () {
        this.super();

        // dragging
        this.dragenterCnt = 0;
        this.curDragoverEL = null;
        this.lastDragoverEL = null;

        // debug
        hierarchy = this;
    },

    ready: function () {
        this.super();

        // register events
        this.addEventListener( "dragenter", function (event) {
            ++this.dragenterCnt;
        }, true);

        this.addEventListener( "dragleave", function (event) {
            --this.dragenterCnt;
            if ( this.dragenterCnt === 0 ) {
                this.resetDragState();
            }
        }, true);

        //
        this.refresh();
    },

    getContextMenuTemplate: function () {
        var template = [
            // Duplicate
            {
                label: 'Duplicate',
                message: 'hierarchy-menu:duplicate',
            },

            // =====================
            { type: 'separator' },

            // Rename
            {
                label: 'Rename',
                message: 'hierarchy-menu:rename',
            },

            // Delete
            {
                label: 'Delete',
                message: 'hierarchy-menu:delete',
            },

            // =====================
            { type: 'separator' },
        ];
        // append Create menu
        var createMenu = Editor.plugins.hierarchy.getMenuTemplate('hierarchy-menu');
        template = template.concat(createMenu);
        //
        return template;
    },

    newItem: function ( name, id, parentEL ) {
        var newEL = new HierarchyItem();
        this.initItem(newEL, name, id, parentEL);
        return newEL;
    },

    setItemIndex: function ( id, nextIdInGame ) {
        var el = this.idToItem[id];
        if ( !el ) {
            //Fire.warn( 'Can not find source element: ' + id );
            return;
        }
        if ( nextIdInGame ) {
            var next = this.idToItem[nextIdInGame];
            if ( !next ) {
                //Fire.warn( 'Can not find next element: ' + nextIdInGame );
                return;
            }
            el.parentElement.insertBefore(el, next);
        }
        else {
            el.parentElement.appendChild(el);
        }
    },

    //beginLoad: function () {
    //    // TODO lock
    //    console.time('hierarchy-tree:load');
    //    // TODO clear
    //},

    //endLoad: function () {
    //    // TODO unlock
    //    console.timeEnd('hierarchy-tree:load');
    //},

    refresh: function () {
        this.clear();

        // 这里只是直接读取场景，但场景在读取过程中很可能发生改变，也可能在读取之前改变的消息这时并没收到。
        // 目前先假设在读取之前和读取过程中，场景不会改变。

        if (!Fire.Engine._scene) {
            return;
        }
        var selection = Editor.Selection.entities;
        function createItem(entity, parentEL) {
            var el = Editor.plugins.hierarchy.newEntity(entity.name, entity._objFlags, entity.id, parentEL);
            if (el) {
                var children = entity._children;
                for (var i = 0, len = children.length; i < len; i++) {
                    createItem(children[i], el);
                }
                el.selected = selection.indexOf(el.userId) !== -1;
            }
        }
        var entities = Fire.Engine._scene.entities;
        for (var i = 0, len = entities.length; i < len; i++) {
            createItem(entities[i]);
        }
    },

    highlightBorder: function ( item ) {
        if ( item && item instanceof HierarchyItem ) {
            var style = this.$.highlightBorder.style;
            style.display = "block";
            style.left = (item.offsetLeft-2) + "px";
            style.top = (item.offsetTop-1) + "px";
            style.width = (item.offsetWidth+4) + "px";
            style.height = (item.offsetHeight+3) + "px";
        }
        else {
            this.$.highlightBorder.style.display = "none";
        }
    },

    highlightInsert: function ( item, position ) {
        if ( item ) {
            var style = this.$.insertLine.style;

            if ( position === 'inside' ) {
                if ( !item.folded && item.firstElementChild ) {
                    style.display = "block";
                    style.top = (item.firstElementChild.offsetTop-1) + "px";
                    style.left = (item.firstElementChild.offsetLeft-2) + "px";
                    style.width = (item.firstElementChild.offsetWidth+4) + "px";
                    style.height = "0px";
                }
                else {
                    style.display = "none";
                }
            }
            else {
                style.display = "block";

                style.left = (item.offsetLeft-2) + "px";
                style.width = (item.offsetWidth+4) + "px";

                if ( position === 'before' )
                    style.top = item.offsetTop + "px";
                else if ( position === 'after'  )
                    style.top = (item.offsetTop + item.offsetHeight) + "px";
                style.height = "0px";
            }
        }
    },

    cancelHighligting: function () {
        this.$.highlightBorder.style.display = "none";
        this.$.insertLine.style.display = "none";
    },

    resetDragState: function () {
        this.cancelHighligting();

        this.curDragoverEL = null;
        this.lastDragoverEL = null;
        this.dragenterCnt = 0;
    },

    moveEntities: function ( targetEL, entities, nextSiblingId ) {
        // TODO: Editor.Selection.filter(entities,'sorted');
        Editor.sendToMainWindow('engine:move-entities', {
            'entity-id-list': entities,
            'parent-id': targetEL ? targetEL.userId : null,
            'next-sibling-id': nextSiblingId
        });
    },

    createEntityFromContextSelect: function () {
        var contextSelection = Editor.Selection.contextEntities;
        if ( contextSelection.length > 0 ) {
            var targetEL = this.idToItem[contextSelection[0]];
            var parentEL = targetEL.parentElement;
            if ( parentEL && parentEL instanceof HierarchyItem ) {
                Editor.sendToMainWindow('engine:create-entity', {
                    'parent-id': parentEL.userId,
                    'options': {
                        'select-in-hierarchy': true
                    }
                });
            }
            else {
                Editor.sendToMainWindow('engine:create-entity', {
                    'options': {
                        'select-in-hierarchy': true
                    }
                });
            }
        }
        else {
            Editor.sendToMainWindow('engine:create-entity', {
                'options': {
                    'select-in-hierarchy': true
                }
            });
        }
    },

    createChildEntityFromContextSelect: function () {
        var contextSelection = Editor.Selection.contextEntities;
        if ( contextSelection.length > 0 ) {
            var targetEL = this.idToItem[contextSelection[0]];
            Editor.sendToMainWindow('engine:create-entity', {
                'parent-id': targetEL.userId,
                'options': {
                    'select-in-hierarchy': true
                }
            });
        }
        else {
            var activeId = Editor.Selection.activeEntityId;
            Editor.sendToMainWindow('engine:create-entity', {
                'parent-id': activeId,
                'options': {
                    'select-in-hierarchy': true
                }
            });
        }
    },

    renameEntityFromContextSelect: function () {
        var contextSelection = Editor.Selection.contextEntities;
        if ( contextSelection.length > 0 ) {
            var targetEL = this.idToItem[contextSelection[0]];
            this.rename(targetEL);
        }
    },

    deleteEntityFromContextSelect: function () {
        var contextSelection = Editor.Selection.contextEntities;
        Editor.sendToMainWindow('engine:delete-entities', {
            'entity-id-list': contextSelection
        });
    },

    duplicateEntityFromContextSelect: function () {
        var contextSelection = Editor.Selection.contextEntities;
        var entities = this.getToplevelElements(contextSelection).map(function (element) {
            return element && element.userId;
        });
        Editor.sendToMainWindow('engine:duplicate-entities', {
            'entity-id-list': entities
        });
    },

    deleteSelection: function () {
        Editor.sendToMainWindow('engine:delete-entities', {
            'entity-id-list': Editor.Selection.entities
        });
    },

    duplicateSelection: function () {
        var entities = this.getToplevelElements(Editor.Selection.entities).map(function (element) {
            return element && element.userId;
        });
        Editor.sendToMainWindow('engine:duplicate-entities', {
            'entity-id-list': entities
        });
    },

    select: function ( element ) {
        Editor.Selection.selectEntity(element.userId, true, true);
    },

    clearSelect: function () {
        Editor.Selection.clearEntity();
        this.activeElement = null;
        this.shiftStartElement = null;
    },

    selectingAction: function (event) {
        event.stopPropagation();
        this.focus();

        var shiftStartEL = this.shiftStartElement;
        this.shiftStartElement = null;

        if ( event.detail.shift ) {
            if ( shiftStartEL === null ) {
                shiftStartEL = this.activeElement;
            }

            this.shiftStartElement = shiftStartEL;

            var el = this.shiftStartElement;
            var userIds = [];

            if ( shiftStartEL !== event.target ) {
                if ( this.shiftStartElement.offsetTop < event.target.offsetTop ) {
                    while ( el !== event.target ) {
                        userIds.push(el.userId);
                        el = this.nextItem(el);
                    }
                }
                else {
                    while ( el !== event.target ) {
                        userIds.push(el.userId);
                        el = this.prevItem(el);
                    }
                }
            }
            userIds.push(event.target.userId);
            Editor.Selection.selectEntity(userIds, true, false);
        }
        else if ( event.detail.toggle ) {
            if ( event.target.selected ) {
                Editor.Selection.unselectEntity(event.target.userId, false);
            }
            else {
                Editor.Selection.selectEntity(event.target.userId, false, false);
            }
        }
        else {
            // if target already selected, do not unselect others
            if ( !event.target.selected ) {
                Editor.Selection.selectEntity(event.target.userId, true, false);
            }
        }
    },

    selectAction: function (event) {
        event.stopPropagation();

        if ( event.detail.shift ) {
            Editor.Selection.confirm();
        }
        else if ( event.detail.toggle ) {
            Editor.Selection.confirm();
        }
        else {
            Editor.Selection.selectEntity(event.target.userId, true);
        }
    },

    renameConfirmAction: function (event) {
        event.stopPropagation();

        var renamingEL = this.$.nameInput.renamingEL;

        this.$.nameInput.style.display = 'none';
        this.$.content.appendChild(this.$.nameInput);
        this.$.nameInput.renamingEL = null;

        // NOTE: the rename confirm will invoke focusoutAction
        window.requestAnimationFrame( function () {
            this.focus();
        }.bind(this));

        renamingEL._renaming = false;

        // TODO: pull up to view ?
        Editor.sendToMainWindow('engine:rename-entity', {
            id: renamingEL.userId,
            name: event.target.value
        } );
    },

    openAction: function (event) {
        if ( event.target instanceof HierarchyItem ) {
            // TODO: align scene view to target
        }
        event.stopPropagation();
    },

    contextmenuAction: function (event) {
        event.preventDefault();
        event.stopPropagation();

        var Remote = require('remote');
        Remote.getCurrentWindow().focus();

        this.resetDragState();

        //
        var curContextID = null;
        if ( event.target instanceof HierarchyItem ) {
            curContextID = event.target.userId;
        }

        Editor.Selection.setContextEntity(curContextID);

        Editor.popupMenu(this.getContextMenuTemplate());
    },

    keydownAction: function (event) {
        this.super([event]);
        if (event.cancelBubble) {
            return;
        }

        switch ( event.which ) {
            // delete (Windows)
            case 46:
                this.deleteSelection();
                event.stopPropagation();
            break;

            // command + delete (Mac)
            case 8:
                if ( event.metaKey ) {
                    this.deleteSelection();
                }
                event.stopPropagation();
            break;
        }
    },

    dragstartAction: function ( event ) {
        event.stopPropagation();

        EditorUI.DragDrop.start( event.dataTransfer, 'move', 'entity', Editor.Selection.entities.map( function (item) {
            var ent = Editor.getInstanceById(item);
            return { name: ent.name, id: item };
        }) );
    },

    dragendAction: function (event) {
        EditorUI.DragDrop.end();

        this.resetDragState();
        Editor.Selection.cancel();
    },

    dragoverAction: function (event) {
        var dragType = EditorUI.DragDrop.type(event.dataTransfer);
        if ( dragType !== "entity" && dragType !== "asset" ) {
            EditorUI.DragDrop.allowDrop( event.dataTransfer, false );
            return;
        }

        //
        event.preventDefault();
        event.stopPropagation();

        //
        if ( event.target ) {
            this.lastDragoverEL = this.curDragoverEL;
            var position;
            var bounding = this.getBoundingClientRect();
            var offsetY = event.clientY - bounding.top + this.scrollTop;
            var target = event.target;

            //
            if ( target !== this.lastDragoverEL ) {
                if ( target === this ) {
                    if ( offsetY <= this.firstElementChild.offsetTop ) {
                        target = this.firstElementChild;
                    }
                    else {
                        target = this.lastElementChild;
                    }
                }
                this.curDragoverEL = target;
            }

            // highlight insertion
            if ( offsetY <= (target.offsetTop + target.offsetHeight * 0.3) )
                position = 'before';
            else if ( offsetY >= (target.offsetTop + target.offsetHeight * 0.7) )
                position = 'after';
            else
                position = 'inside';

            if ( position === 'inside' ) {
                this.highlightBorder( target );
            }
            else {
                this.highlightBorder( target.parentElement );
            }
            this.highlightInsert( target, position );

            //
            EditorUI.DragDrop.allowDrop(event.dataTransfer, true);
        }

        //
        var dropEffect = "none";
        if ( dragType === "asset" ) {
            dropEffect = "copy";
        }
        else if ( dragType === "entity" ) {
            dropEffect = "move";
        }
        EditorUI.DragDrop.updateDropEffect(event.dataTransfer, dropEffect);
    },

    dropAction: function ( event ) {
        var dragType = EditorUI.DragDrop.type(event.dataTransfer);
        if ( dragType !== 'asset' && dragType !== 'entity' )
            return;

        event.preventDefault();
        event.stopPropagation();

        var items = EditorUI.DragDrop.drop(event.dataTransfer);

        this.resetDragState();
        Editor.Selection.cancel();

        if ( items.length > 0 ) {
            // get next sibliing id
            var hoverTarget = event.target;
            var targetEL = null;
            var nextSiblingId = null;
            var bounding = this.getBoundingClientRect();
            var offsetY = event.clientY - bounding.top + this.scrollTop;

            if ( hoverTarget === this ) {
                targetEL = null;
                if ( this.firstElementChild ) {
                    if ( offsetY <= this.firstElementChild.offsetTop ) {
                        nextSiblingId = this.firstElementChild.userId;
                    }
                }
            }
            else {
                if ( offsetY <= (hoverTarget.offsetTop + hoverTarget.offsetHeight * 0.3) ) {
                    nextSiblingId = hoverTarget.userId;
                    targetEL = hoverTarget.parentElement;
                }
                else if ( offsetY >= (hoverTarget.offsetTop + hoverTarget.offsetHeight * 0.7) ) {
                    if ( hoverTarget.nextElementSibling ) {
                        nextSiblingId = hoverTarget.nextElementSibling.userId;
                    }
                    else {
                        nextSiblingId = null;
                    }
                    targetEL = hoverTarget.parentElement;
                }
                else {
                    nextSiblingId = null;
                    targetEL = hoverTarget;
                    if ( targetEL.firstElementChild ) {
                        nextSiblingId = targetEL.firstElementChild.userId;
                    }
                }
            }

            // if target is root, set it to null
            if ( targetEL === this ) {
                targetEL = null;
            }

            // process
            if ( dragType === 'entity' ) {
                this.moveEntities( targetEL, items, nextSiblingId );
            }
            else if ( dragType === 'asset' ) {
                var parentEnt = null;
                if ( targetEL )
                    parentEnt = Editor.getInstanceById(targetEL.userId);

                Editor.Selection.clearEntity();
                var onload = function ( err, asset ) {
                    if ( asset && asset.createEntity ) {
                        asset.createEntity( function ( ent ) {
                            ent.parent = parentEnt;
                            ent.transform.position = new Fire.Vec2(0,0);
                            Editor.Selection.selectEntity( ent.id, false, true );
                            Editor.sendToMainWindow( 'entity:added', ent.id );
                            Editor.sendToWindows( 'scene:dirty' );
                            Fire.AssetLibrary.cacheAsset( asset );
                        }.bind(this) );
                    }
                }.bind(this);

                for ( var i = 0; i < items.length; ++i ) {
                    Fire.AssetLibrary.loadAssetInEditor( items[i], onload );
                }
            }
        }
    },

});
