/*
 * Tiny Scrollbar
 * http://www.baijs.nl/tinyscrollbar/
 *
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/gpl-2.0.php
 *
 * Date: 13 / 08 / 2012
 * @version 1.81
 * @author Maarten Baijs
 *
 */
;( function( $ )
{
    $.tiny = $.tiny || { };

    $.tiny.scrollbar = {
        options: {
            axis         : 'y'    // vertical or horizontal scrollbar? ( x || y ).
            ,   wheel        : 40     // how many pixels must the mouswheel scroll at a time.
            ,   scroll       : true   // enable or disable the mousewheel.
            ,   lockscroll   : true   // return scrollwheel to browser if there is no more content.
            ,   size         : 'auto' // set the size of the scrollbar to auto or a fixed number.
            ,   sizethumb    : 'auto' // set the size of the thumb to auto or a fixed number.
            ,   invertscroll : false  // Enable mobile invert style scrolling
            ,   showOnTouch  : true
        }
    };

    $.fn.tinyscrollbar = function( params )
    {
        var options = $.extend( {}, $.tiny.scrollbar.options, params );

        this.each( function()
        {
            $( this ).data('tsb', new Scrollbar( $( this ), options ) );
        });

        return this;
    };

    $.fn.tinyscrollbar_update = function(sScroll)
    {
        return $( this ).data( 'tsb' ).update( sScroll );
    };

    function Scrollbar( root, options )
    {
        var oSelf       = this
            ,   oWrapper    = root
            ,   oViewport   = { obj: $( '.viewport', root ) }
            ,   oContent    = { obj: $( '.overview', root ) }
            ,   oScrollbar  = { obj: $( '.scrollbar', root ) }
            ,   oTrack      = { obj: $( '.track', oScrollbar.obj ) }
            ,   oThumb      = { obj: $( '.thumb', oScrollbar.obj ) }
            ,   sAxis       = options.axis === 'x'
            ,   sDirection  = sAxis ? 'left' : 'top'
            ,   sSize       = sAxis ? 'Width' : 'Height'
            ,   iScroll     = 0
            ,   iPosition   = { start: 0, now: 0 }
            ,   iMouse      = {}
            ,   touchEvents = 'ontouchstart' in document.documentElement
            ,   started = false
            ,   deviation = 0
            ,   maxDeviation = 50
            ,   showOnTouch   = options.showOnTouch
            ;

        function initialize()
        {
            oSelf.update();
            setEvents();

            return oSelf;
        }

        function isEnabled()
        {
            return oContent.ratio < 1;
        }

        this.update = function( sScroll )
        {
            oViewport[ options.axis ] = oViewport.obj[0][ 'offset'+ sSize ];
            oContent[ options.axis ]  = oContent.obj[0][ 'scroll'+ sSize ];
            oContent.ratio            = oViewport[ options.axis ] / oContent[ options.axis ];

            oScrollbar.obj.toggleClass( 'disable', !isEnabled() );

            oTrack[ options.axis ] = options.size === 'auto' ? oViewport[ options.axis ] : options.size;
            oThumb[ options.axis ] = Math.min( oTrack[ options.axis ], Math.max( 0, ( options.sizethumb === 'auto' ? ( oTrack[ options.axis ] * oContent.ratio ) : options.sizethumb ) ) );

            oScrollbar.ratio = options.sizethumb === 'auto' ? ( oContent[ options.axis ] / oTrack[ options.axis ] ) : ( oContent[ options.axis ] - oViewport[ options.axis ] ) / ( oTrack[ options.axis ] - oThumb[ options.axis ] );

            iScroll = ( sScroll === 'relative' && oContent.ratio <= 1 ) ? Math.min( ( oContent[ options.axis ] - oViewport[ options.axis ] ), Math.max( 0, iScroll )) : 0;
            iScroll = ( sScroll === 'bottom' && oContent.ratio <= 1 ) ? ( oContent[ options.axis ] - oViewport[ options.axis ] ) : isNaN( parseInt( sScroll, 10 ) ) ? iScroll : parseInt( sScroll, 10 );

            setSize();
        };

        function setSize()
        {
            var sCssSize = sSize.toLowerCase();

            oThumb.obj.css( sDirection, iScroll / oScrollbar.ratio );
            oContent.obj.css( sDirection, -iScroll );
            iMouse.start = oThumb.obj.offset()[ sDirection ];

            oScrollbar.obj.css( sCssSize, oTrack[ options.axis ] );
            oTrack.obj.css( sCssSize, oTrack[ options.axis ] );
            oThumb.obj.css( sCssSize, oThumb[ options.axis ] );
        }

        function setEvents()
        {
            if( ! touchEvents )
            {
                oThumb.obj.bind( 'mousedown', start );
                oTrack.obj.bind( 'mouseup', drag );
                oTrack.obj.bind( 'click', click );
            }
            else
            {
                if(showOnTouch) {
                    oScrollbar.obj.show();
                }
                //oTrack.obj.ontouchstart = click;
                oViewport.obj[0].ontouchstart = function( event )
                {
                    if( 1 === event.touches.length )
                    {
                        start( event.touches[ 0 ] );
                        //event.stopPropagation();
                    }
                };
            }

            if( options.scroll && window.addEventListener )
            {
                oWrapper[0].addEventListener( 'DOMMouseScroll', wheel, false );
                oWrapper[0].addEventListener( 'mousewheel', wheel, false );
                oWrapper[0].addEventListener( 'MozMousePixelScroll', function( event ){
                    event.preventDefault();
                }, false);
            }
            else if( options.scroll )
            {
                oWrapper[0].onmousewheel = wheel;
            }
        }

        function start( event )
        {
            started = true;

            $( "body" ).addClass( "noSelect" );

            var oThumbDir   = parseInt( oThumb.obj.css( sDirection ), 10 );
            iMouse.start = sAxis ? event.pageX : event.pageY;
            deviation =  sAxis ? event.pageY : event.pageX ;
            iPosition.start = oThumbDir == 'auto' ? 0 : oThumbDir;

            if( ! touchEvents )
            {
                $( document ).bind( 'mousemove', drag );
                $( document ).bind( 'mouseup', end );
                oThumb.obj.bind( 'mouseup', end );
            }
            else
            {
                document.ontouchmove = function( event )
                {
                    drag( event.touches[ 0 ], event );
                };
                document.ontouchend = end;
            }
        }

        function wheel( event )
        {
            if( isEnabled() )
            {
                var oEvent = event || window.event
                    ,   iDelta = oEvent.wheelDelta ? oEvent.wheelDelta / 120 : -oEvent.detail / 3
                    ;

                iScroll -= iDelta * options.wheel;
                iScroll = Math.min( ( oContent[ options.axis ] - oViewport[ options.axis ] ), Math.max( 0, iScroll ));

                oThumb.obj.css( sDirection, iScroll / oScrollbar.ratio );
                oContent.obj.css( sDirection, -iScroll );

                if( options.lockscroll || ( iScroll !== ( oContent[ options.axis ] - oViewport[ options.axis ] ) && iScroll !== 0 ) )
                {
                    oEvent = $.event.fix( oEvent );
                    oEvent.preventDefault();
                }
            }
        }

        function click(event) {
            if (started) {
                //prevent click when drag
                return false;
            }

            iMouse.start = 0;
            iPosition.start = oThumb[ options.axis ] / 2 - oTrack[ options.axis ];
            drag(event);
        }

        function drag( event, originalEvent )
        {
            if( isEnabled() )
            {
                var pos,
                    page = ( sAxis ? event.pageX : event.pageY ),
                    currentDeviation = ( sAxis ? event.pageY : event.pageX )
                ;

                //only drag && touch
                if (started && touchEvents && Math.abs(currentDeviation - deviation) > maxDeviation) {
                    //$('.thumb').css('background', '#F00');
                    //end();
                    return;
                } else if(typeof originalEvent != 'undefined') {
                    originalEvent.preventDefault();
                }

                if( options.invertscroll && touchEvents )
                {
                    pos = iMouse.start - page;
                }
                else
                {
                    pos = page - iMouse.start;
                }

                iPosition.now = Math.min( ( oTrack[ options.axis ] - oThumb[ options.axis ] ), Math.max( 0, ( iPosition.start + pos)));

                iScroll = iPosition.now * oScrollbar.ratio;
                oContent.obj.css( sDirection, -iScroll );
                oThumb.obj.css( sDirection, iPosition.now );
            }
        }

        function end()
        {
            $( "body" ).removeClass( "noSelect" );
            //TODO namespaced?
            $( document ).unbind( 'mousemove', drag );
            $( document ).unbind( 'mouseup', end );
            oThumb.obj.unbind( 'mouseup', end );
            document.ontouchmove = document.ontouchend = null;

            //because click is fired right away
            setTimeout(function(){
                started = false;
            }, 150);
        }

        return initialize();
    }

}(jQuery));