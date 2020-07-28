<?php

namespace Elementor\Core\Import_Export\Directories;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

class Content extends Base {

	protected function get_name() {
		return 'content';
	}

	protected function get_default_sub_directories() {
		$post_types = $this->exporter->get_settings( 'post_types' );

		$sub_directories = [];

		foreach( $post_types as $post_type ) {
			$sub_directories[] = new Post_Type( $this->exporter, $this, $post_type );
		}

		return $sub_directories;
	}
}