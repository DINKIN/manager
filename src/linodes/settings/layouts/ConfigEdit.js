import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { getLinode, loadLinode } from '~/linodes/layouts/LinodeDetailPage';
import { fetchLinode, fetchLinodeConfig, putLinodeConfig } from '~/actions/api/linodes';
import { fetchAllKernels } from '~/actions/api/kernels';
import HelpButton from '~/components/HelpButton';
import { ErrorSummary, FormGroup, reduceErrors } from '~/errors';
import { Link } from '~/components/Link';
import Slider from 'rc-slider';

export class ConfigEdit extends Component {
  constructor() {
    super();
    this.getLinode = getLinode.bind(this);
    this.loadLinode = loadLinode.bind(this);
    this.renderEditUI = this.renderEditUI.bind(this);
    this.saveChanges = this.saveChanges.bind(this);
    this.state = {
      loading: true,
      errors: {},
      virt_mode: 'paravirt',
      run_level: 'default',
      comments: '',
      label: '',
      ram_limit: 0,
      kernel: '',
      disable_update_db: false,
      enable_distro_helper: true,
      enable_network_helper: true,
      enable_modules_dep_helper: true,
    };
  }

  async componentDidMount() {
    const { dispatch } = this.props;
    let linode = this.getLinode();
    const linodeId = parseInt(this.props.params.linodeId);
    const configId = parseInt(this.props.params.configId);
    if (!linode) {
      await dispatch(fetchLinode(linodeId));
      linode = this.getLinode();
    }
    let config = this.getConfig();
    if (!config) {
      await dispatch(fetchLinodeConfig(linodeId, configId));
      config = this.getConfig();
    }
    this.setState({
      ...config,
      ...config.helpers,
      loading: false,
      kernel: config.kernel.id,
    });
    const { kernels } = this.props;
    if (kernels.totalPages === -1) {
      await dispatch(fetchAllKernels());
    }
  }

  getConfig() {
    const linode = this.getLinode();
    if (!linode) {
      return null;
    }
    const configId = parseInt(this.props.params.configId);
    return linode._configs.configs[configId] || null;
  }

  async saveChanges() {
    const state = this.state;
    const { dispatch } = this.props;
    const linode = this.getLinode();
    const config = this.getConfig();

    this.setState({ loading: true, errors: {} });
    try {
      await dispatch(putLinodeConfig({
        label: state.label,
        comments: state.comments,
        ram_limit: state.ram_limit,
        run_level: state.run_level,
        virt_mode: state.virt_mode,
        // kernel: { id: state.kernel }, // API bug
        helpers: {
          disable_update_db: state.disable_update_db,
          enable_distro_helper: state.enable_distro_helper,
          enable_network_helper: state.enable_network_helper,
          enable_modules_dep_helper: state.enable_modules_dep_helper,
        },
      }, linode.id, config.id));
      this.setState({ loading: false });
    } catch (response) {
      this.setState({ loading: false, errors: await reduceErrors(response) });
    }
  }

  renderEditUI() {
    const linode = this.getLinode();
    const totalRam = linode.services.reduce((t, s) => t + s.ram, 0);
    const { kernels } = this.props;
    const state = this.state;
    const input = (display, field, control) => (
      <FormGroup errors={state.errors} field={field} className="row">
        <label
          htmlFor={`config-${field}`}
          className="col-sm-1 col-form-label"
        >{display}</label>
        <div className="col-sm-5">{control}</div>
      </FormGroup>);
    const text = (display, field) => input(display, field,
      <input
        className="form-control"
        id={`config-${field}`}
        disabled={state.loading}
        placeholder={display}
        value={state[field]}
        onChange={e => this.setState({ [field]: e.target.value })}
      />);
    const radio = (display, field, value) => (
      <div className="form-check">
        <label className="form-check-label">
          <input
            className="form-check-input"
            type="radio"
            name={`config-${field}`}
            id={`config-${field}-${value}`}
            disabled={state.loading}
            value={value}
            checked={state[field] === value}
            onChange={e => this.setState({ [field]: e.target.value })}
          /> {display}
        </label>
      </div>);
    const checkbox = (display, field) => (
      <div className="form-check">
        <label className="form-check-label">
          <input
            className="form-check-input"
            type="checkbox"
            name={`config-${field}`}
            id={`config-${field}`}
            disabled={state.loading}
            checked={state[field]}
            onChange={e => this.setState({ [field]: e.target.checked })}
          /> {display}
        </label>
      </div>);

    return (
      <div style={{ marginTop: '2rem' }}>
        {text('Label', 'label')}
        {input('Notes', 'comments',
          <textarea
            className="form-control"
            id="config-comments"
            placeholder="Notes"
            value={state.comments}
            disabled={state.loading}
            onChange={e => this.setState({ comments: e.target.value })}
          />)}
        <hr />
        <div className="form-group row">
          <label
            htmlFor="config-kernel"
            className="col-sm-2 col-form-label"
          >Kernel</label>
          <div className="col-sm-4">
            <select
              className="form-control"
              id="config-kernel"
              value={this.state.kernel}
              disabled={state.loading}
              onChange={e => this.setState({ kernel: e.target.value })}
            >{Object.values(kernels.kernels).map(kernel => {
              const map = {
                'linode/latest': 'Latest 32-bit kernel',
                'linode/latest_64': 'Latest 64-bit kernel',
              };
              return (
                <option key={kernel.id} value={kernel.id}>
                  {map[kernel.id] || kernel.label}
                </option>);
            })}</select>
          </div>
        </div>
        <hr />
        <fieldset className="form-group row">
          <legend className="col-sm-2 col-form-legend">
            Helpers
          </legend>
          <div className="col-md-3">
            {checkbox('Enable distro helper', 'enable_distro_helper')}
            {checkbox('Enable network helper', 'enable_network_helper')}
            {checkbox('Enable modules.dep helper', 'enable_modules_dep_helper')}
            {checkbox('Disable updatedb', 'disable_update_db')}
          </div>
        </fieldset>
        <hr />
        <fieldset className="form-group row">
          <legend className="col-form-legend col-sm-2">
            Virtualization mode
          </legend>
          <div className="col-sm-3">
            {radio('Paravirtualization', 'virt_mode', 'paravirt')}
            {radio('Full virtualization', 'virt_mode', 'fullvirt')}
          </div>
        </fieldset>
        <hr />
        <fieldset className="form-group row">
          <legend className="col-form-legend col-sm-2">
            Run level
          </legend>
          <div className="col-sm-3">
            {radio('Default', 'run_level', 'default')}
            {radio('Single-user mode', 'run_level', 'single')}
            {radio('init=/bin/bash', 'run_level', 'binbash')}
          </div>
        </fieldset>
        <hr />
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">Memory limit</label>
          <div className="col-sm-3 align-slider">
            <Slider
              min={0}
              max={totalRam}
              step={128}
              value={state.ram_limit}
              onChange={v => this.setState({ ram_limit: v })}
              tipFormatter={v => `${v} MiB`}
              disabled={state.loading}
            />
          </div>
          <label className="col-sm-2 col-form-label">{state.ram_limit} MiB</label>
        </div>
        <hr />
        <p>TODO: block device assignment</p>
        <ErrorSummary errors={state.errors} />
        <button
          className="btn btn-primary"
          disabled={state.loading}
          onClick={() => this.saveChanges()}
        >Save</button>
        <Link
          className="btn btn-default"
          style={{ marginLeft: '0.5rem' }}
          to={`/linodes/${this.props.params.linodeId}/settings/advanced`}
        >Cancel</Link>
      </div>
    );
  }

  render() {
    return (
      <div>
        <h3>
          Edit profile
          <HelpButton to="https://example.org" />
        </h3>
        {this.renderEditUI()}
      </div>
    );
  }
}

ConfigEdit.propTypes = {
  linodes: PropTypes.object.isRequired,
  kernels: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  params: PropTypes.shape({
    linodeId: PropTypes.string,
    configId: PropTypes.string,
  }),
};

function select(state) {
  return {
    linodes: state.api.linodes,
    kernels: state.api.kernels,
  };
}

export default connect(select)(ConfigEdit);
