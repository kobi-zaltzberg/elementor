var EditModeItemView = require( 'elementor-regions/panel/edit-mode' ),
	PanelLayoutView;

PanelLayoutView = Marionette.LayoutView.extend( {
	template: '#tmpl-elementor-panel',

	id: 'elementor-panel-inner',

	regions: {
		content: '#elementor-panel-content-wrapper',
		header: '#elementor-panel-header-wrapper',
		footer: '#elementor-panel-footer',
		modeSwitcher: '#elementor-mode-switcher',
	},

	pages: {},

	childEvents: {
		'click:add': function() {
			elementorCommon.route.to( 'panel/elements' );
		},
		'editor:destroy': function() {
			elementorCommon.route.to( 'panel/elements', {
				autoFocusSearch: false,
			} );
		},
	},

	currentPageName: null,

	currentPageView: null,

	perfectScrollbar: null,

	initialize: function() {
		elementorCommon.route.register( 'panel/elements', ( args ) => {
			this.setPage( 'elements', null, args );
		} );

		elementorCommon.route.register( 'panel/editor', ( args ) => {
			this.openEditor( args.model, args.view );
		} );

		elementorCommon.route.register( 'panel/editor/content', () => {
			elementor.getPanelView().getCurrentPageView().activateTab( 'content' );
		} );

		elementorCommon.route.register( 'panel/editor/style', () => {
			elementor.getPanelView().getCurrentPageView().activateTab( 'style' );
		} );

		elementorCommon.route.register( 'panel/editor/advanced', () => {
			elementor.getPanelView().getCurrentPageView().activateTab( 'advanced' );
		} );

		// Section.
		elementorCommon.route.register( 'panel/editor/layout', () => {
			elementor.getPanelView().getCurrentPageView().activateTab( 'layout' );
		} );

		// Page.
		elementorCommon.route.register( 'panel/editor/settings', () => {
			elementor.getPanelView().getCurrentPageView().activateTab( 'settings' );
		} );

		// Global Settings - Lightbox.
		elementorCommon.route.register( 'panel/editor/lightbox', () => {
			elementor.getPanelView().getCurrentPageView().activateTab( 'lightbox' );
		} );

		elementorCommon.route.register( 'panel/menu', () => {
			this.setPage( 'menu' );
		} );

		this.initPages();
	},

	buildPages: function() {
		var pages = {
			elements: {
				view: require( 'elementor-panel/pages/elements/elements' ),
				title: '<img src="' + elementorCommon.config.urls.assets + 'images/logo-panel.svg">',
			},
			editor: {
				view: require( 'elementor-panel/pages/editor' ),
			},
			menu: {
				view: elementor.modules.layouts.panel.pages.menu.Menu,
				title: '<img src="' + elementorCommon.config.urls.assets + 'images/logo-panel.svg">',
			},
			colorScheme: {
				view: require( 'elementor-panel/pages/schemes/colors' ),
			},
			typographyScheme: {
				view: require( 'elementor-panel/pages/schemes/typography' ),
			},
			colorPickerScheme: {
				view: require( 'elementor-panel/pages/schemes/color-picker' ),
			},
		};

		var schemesTypes = Object.keys( elementor.schemes.getSchemes() ),
			disabledSchemes = _.difference( schemesTypes, elementor.schemes.getEnabledSchemesTypes() );

		_.each( disabledSchemes, function( schemeType ) {
			var scheme = elementor.schemes.getScheme( schemeType );

			pages[ schemeType + 'Scheme' ].view = require( 'elementor-panel/pages/schemes/disabled' ).extend( {
				disabledTitle: scheme.disabled_title,
			} );
		} );

		return pages;
	},

	initPages: function() {
		var pages;

		this.getPages = function( page ) {
			if ( ! pages ) {
				pages = this.buildPages();
			}

			return page ? pages[ page ] : pages;
		};

		this.addPage = function( pageName, pageData ) {
			if ( ! pages ) {
				pages = this.buildPages();
			}

			pages[ pageName ] = pageData;
		};
	},

	getHeaderView: function() {
		return this.getChildView( 'header' );
	},

	getFooterView: function() {
		return this.getChildView( 'footer' );
	},

	getCurrentPageName: function() {
		return this.currentPageName;
	},

	getCurrentPageView: function() {
		return this.currentPageView;
	},

	setPage: function( page, title, viewOptions ) {
		const pages = this.getPages();

		if ( 'elements' === page && ! elementor.userCan( 'design' ) ) {
			if ( pages.page_settings ) {
				page = 'page_settings';
			}
		}

		const pageData = pages[ page ];

		if ( ! pageData ) {
			throw new ReferenceError( 'Elementor panel doesn\'t have page named \'' + page + '\'' );
		}

		if ( pageData.options ) {
			viewOptions = _.extend( pageData.options, viewOptions );
		}

		let View = pageData.view;

		if ( pageData.getView ) {
			View = pageData.getView();
		}

		this.currentPageName = page;

		this.currentPageView = new View( viewOptions );

		this.showChildView( 'content', this.currentPageView );

		this.getHeaderView().setTitle( title || pageData.title );

		this
			.trigger( 'set:page', this.currentPageView )
			.trigger( 'set:page:' + page, this.currentPageView );
	},

	openEditor: function( model, view ) {
		this.setPage( 'editor', elementor.translate( 'edit_element', [ elementor.getElementData( model ).title ] ), {
			model: model,
			controls: elementor.getElementControls( model ),
			editedElementView: view,
		} );

		const action = 'panel/open_editor/' + model.get( 'elType' );

		// Example: panel/open_editor/widget
		elementor.hooks.doAction( action, this, model, view );

		// Example: panel/open_editor/widget/heading
		elementor.hooks.doAction( action + '/' + model.get( 'widgetType' ), this, model, view );
	},

	onBeforeShow: function() {
		var PanelFooterItemView = require( 'elementor-regions/panel/footer' ),
			PanelHeaderItemView = require( 'elementor-regions/panel/header' );

		// Edit Mode
		this.showChildView( 'modeSwitcher', new EditModeItemView() );

		// Header
		this.showChildView( 'header', new PanelHeaderItemView() );

		// Footer
		this.showChildView( 'footer', new PanelFooterItemView() );

		// Added Editor events
		this.updateScrollbar = _.throttle( this.updateScrollbar, 100 );

		this.getRegion( 'content' )
			.on( 'before:show', this.onEditorBeforeShow.bind( this ) )
			.on( 'empty', this.onEditorEmpty.bind( this ) )
			.on( 'show', this.updateScrollbar.bind( this ) );

		// Set default page to elements
		elementorCommon.route.to( 'panel/elements' );
	},

	onEditorBeforeShow: function() {
		_.defer( this.updateScrollbar.bind( this ) );
	},

	onEditorEmpty: function() {
		this.updateScrollbar();
	},

	updateScrollbar: function() {
		if ( ! this.perfectScrollbar ) {
			this.perfectScrollbar = new PerfectScrollbar( this.content.el, {
				suppressScrollX: true,
			} );

			return;
		}

		this.perfectScrollbar.update();
	},
} );

module.exports = PanelLayoutView;
