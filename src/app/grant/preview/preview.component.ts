import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  ActionAuthorities, AttachmentTemplates,
  Attribute, Doc, DocumentKpiSubmission, FileTemplates,
  Grant, GrantDetails,
  GrantKpi,
  Kpi, Note, NoteTemplates,
  QualitativeKpiSubmission,
  QuantitiaveKpisubmission,
  Section,
  Submission,
  SubmissionStatus, Template,TableData, TemplateLibrary, WorkflowAssignmentModel, WorkflowAssignment
} from '../../model/dahsboard';
import {GrantDataService} from '../../grant.data.service';
import {SubmissionDataService} from '../../submission.data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AppComponent} from '../../app.component';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {ToastrService} from 'ngx-toastr';
import {MatBottomSheet, MatDatepickerInputEvent, MatDialog} from '@angular/material';
import {DatePipe} from '@angular/common';
import {Colors} from '../../model/app-config';
import {interval} from 'rxjs';
import {FieldDialogComponent} from '../../components/field-dialog/field-dialog.component';
import {BottomsheetComponent} from '../../components/bottomsheet/bottomsheet.component';
import {WfassignmentComponent} from '../../components/wfassignment/wfassignment.component';
import {BottomsheetAttachmentsComponent} from '../../components/bottomsheetAttachments/bottomsheetAttachments.component';
import {BottomsheetNotesComponent} from '../../components/bottomsheetNotes/bottomsheetNotes.component';
import {GrantNotesComponent} from '../../components/grantNotes/grantNotes.component';
import {PdfDocument} from "../../model/pdf-document";
import {TemplateDialogComponent} from '../../components/template-dialog/template-dialog.component';
import { HumanizeDurationLanguage, HumanizeDuration } from 'humanize-duration-ts';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import * as $ from 'jquery'



@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit {

  hasKpisToSubmit: boolean;
  kpiSubmissionTitle: string;
  currentGrant: Grant;
  originalGrant: Grant;
  editMode = false;
  firstColumnInitialPosition: number;
  currentSubmission: Submission;
  canManage = false;
  attachmentsSideNavOpened = true;
  schedule = 3;
  currentKPIType = 'Quantitative';
  currentKPIReportingType = 'Activity';
  timer: any;
  grantToUpdate: Grant;
  erroredElement: ElementRef;
  erroredField: string;
  langService: HumanizeDurationLanguage = new HumanizeDurationLanguage();
  humanizer: HumanizeDuration = new HumanizeDuration(this.langService);
  action: string;

  @ViewChild('editFieldModal') editFieldModal: ElementRef;
  @ViewChild('createFieldModal') createFieldModal: ElementRef;
  @ViewChild('createSectionModal') createSectionModal: ElementRef;
  @ViewChild('createKpiModal') createKpiModal: ElementRef;
  @ViewChild('addKpiButton') addKpiButton: ElementRef;
  @ViewChild('actionBlock') actionBlock: ElementRef;
  @ViewChild('saveGrantButton') saveGrantButton: ElementRef;
  @ViewChild('kpiTypeElem') kpiTypeElem: ElementRef;
  @ViewChild('kpiDescriptionElem') kpiDescriptionelem: ElementRef;
  @ViewChild('kpiBlock') kpiBlock: ElementRef;
  @ViewChild('sidenav') attachmentsSideNav: any;
  @ViewChild('selectScheduleModal') selectScheduleModal: ElementRef;
  @ViewChild('container') container: ElementRef;
  @ViewChild('grantSummary') grantSummary: ElementRef;
  @ViewChild('previewarea') previewArea: ElementRef;

  constructor(private grantData: GrantDataService
      , private submissionData: SubmissionDataService
      , private route: ActivatedRoute
      , private router: Router
      , private submissionDataService: SubmissionDataService
      , public appComp: AppComponent
      , private http: HttpClient
      , private toastr: ToastrService
      , private dialog: MatDialog
      , private _bottomSheet: MatBottomSheet
      , private elem: ElementRef
      , private datepipe: DatePipe
      , public colors: Colors) {
    this.colors = new Colors();
  }

  ngOnInit() {

  this.appComp.sectionUpdated = false;;

    /*interval(3000).subscribe(t => {

      console.log('Came here');
      if (this.editMode) {
        this.appComp.autosave = true;
        this.grantToUpdate = JSON.parse(JSON.stringify(this.currentGrant));
        this.saveGrant();
      } else {
        this.appComp.autosave = false;
      }
    });*/

    this.grantData.currentMessage.subscribe(grant => this.currentGrant = grant);

    if(this.currentGrant.startDate && this.currentGrant.endDate){
      var time = new Date(this.currentGrant.endDate).getTime() - new Date(this.currentGrant.startDate).getTime();
      time = time + 86400001;
      this.currentGrant.duration = this.humanizer.humanize(time, { largest: 2, units: ['y', 'mo'], round: true});
    }else{
      this.currentGrant.duration = 'No end date';
    }

    for(let section of this.currentGrant.grantDetails.sections){
    if(section.attributes){
      for(let attribute of section.attributes){
        if(attribute.fieldType ==='document'){
          let docs;
          try {
            docs = JSON.parse(attribute.fieldValue);
          } catch(e){
            docs = [];
          }
          if(docs.length > 0){
            attribute.docs = new Array<TemplateLibrary>();
            for(let i=0; i< docs.length; i++){
              attribute.docs.push(docs[i]);
            }
          }
        }
        }
      }
    }

    this.grantData.changeMessage(this.currentGrant);
    console.log(this.currentGrant);

    this.originalGrant = JSON.parse(JSON.stringify(this.currentGrant));
    this.submissionData.currentMessage.subscribe(submission => this.currentSubmission = submission);

    //this.checkGrantPermissions();
    //this.checkCurrentSubmission();

    $('#editFieldModal').on('shown.bs.modal', function (event) {
      $('#editFieldInput').focus();
    });

    $('#createFieldModal').on('shown.bs.modal', function (event) {
      $('#fieldTitleInput').focus();
    });

    $('#createSectionModal').on('shown.bs.modal', function (event) {
      $('#sectionTitleInput').focus();
    });

    $('#createKpiModal').on('shown.bs.modal', function (event) {
      $('#kpiDescription').focus();
    });
  }

  getDocumentName(val: string): any[] {
    let obj;
    if(val!==""){
        obj = JSON.parse(val);
    }
    return obj;
  }
  private checkGrantPermissions() {
    if (this.currentGrant.actionAuthorities.permissions.includes('MANAGE')) {
      this.canManage = true;
    } else {
      this.canManage = false;
    }
  }

  private checkCurrentSubmission() {
    for (const submission of this.currentGrant.submissions) {
      if (submission.flowAuthorities) {
        this.hasKpisToSubmit = true;
        this.kpiSubmissionTitle = submission.title;
        this.currentSubmission = submission;
        break;
      }
    }
  }

  /*ngAfterViewInit(): void {
    const firstCol = $('.first-column');
    if (firstCol.length) {
      this.firstColumnInitialPosition = firstCol.position().left;
    }
  }*/

  /*ngAfterContentChecked(): void {
    this._adjustHeights();
    //this._setFlowButtonColors();
  }*/

  rememberScrollPosition(event: Event) {
    console.log(event);
  }

  viewKpisToSubmit(submissionId: number) {
    for (const submission of this.currentGrant.submissions) {
      if (submission.id === submissionId) {
        this.submissionDataService.changeMessage(submission);
        break;
      }
    }
    this.router.navigate(['kpisubmission']);
  }

  editFieldEntry(identifier: string) {
    console.log(this.currentGrant);
    this._setEditMode(true);
    const editFieldModal = this.editFieldModal.nativeElement;

    const modalTitle = $(editFieldModal).find('#editFieldLabel');
    const modalValue = $(editFieldModal).find('#editFieldInput');
    const modalIdHolder = $(editFieldModal).find('#editFieldIdHolder');
    $(modalTitle).html($('#attribute_name_id_' + identifier).html());
    $(modalValue).val($('#attribute_value_id_' + identifier).html());
    $(modalIdHolder).val(identifier);

    $(modalValue).focus();
    $(editFieldModal).modal('show');
  }


  confirm(sectionId: number, attributeId: number, submissios: Submission[], kpiId: number, func: string, title: string) {

    const dialogRef = this.dialog.open(FieldDialogComponent, {
      data: title
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        switch (func) {
          case 'field':
            this.deleteFieldEntry(sectionId, attributeId);
            break;
          case 'section':
            this.deleteSection(Number(sectionId));
            break;
          case 'clearSubmissions':
            this.clearSubmissions();
            break;
          case 'wfassignment':
            this.showWorkflowAssigments(sectionId);
            break;
          case 'kpi':
            this.deleteKpi(kpiId);
            break;
        }
      } else {

        dialogRef.close();
      }
    });
  }

  deleteFieldEntry(sectionId: number, attributeId: number) {
    for (const section of this.currentGrant.grantDetails.sections) {
      if (section.id === sectionId) {
        const index = section.attributes.findIndex(attr => attr.id === attributeId);
        section.attributes.splice(index, 1);
        this.checkGrant();
      }
    }
  }

  saveTemplate(templateId: number, templateName: string){
  }

  deleteKpi(kpiId: number) {
    for (const kpi of this.currentGrant.kpis) {
      if (kpi.id === kpiId) {
        const index = this.currentGrant.kpis.findIndex(k => k.id === kpiId);
        this.currentGrant.kpis.splice(index, 1);
      }
    }

    for (const sub of this.currentGrant.submissions) {
      for (const kpiData of sub.quantitiaveKpisubmissions) {
        if (kpiData.grantKpi.id === kpiId) {
          const index = sub.quantitiaveKpisubmissions.findIndex(k => k.grantKpi.id === kpiId);
          sub.quantitiaveKpisubmissions.splice(index, 1);
        }
      }
      for (const kpiData of sub.qualitativeKpiSubmissions) {
        if (kpiData.grantKpi.id === kpiId) {
          const index = sub.qualitativeKpiSubmissions.findIndex(k => k.grantKpi.id === kpiId);
          sub.qualitativeKpiSubmissions.splice(index, 1);
        }
      }
      for (const kpiData of sub.documentKpiSubmissions) {
        if (kpiData.grantKpi.id === kpiId) {
          const index = sub.documentKpiSubmissions.findIndex(k => k.grantKpi.id === kpiId);
          sub.qualitativeKpiSubmissions.splice(index, 1);
        }
      }
    }

    this.checkGrant();
  }

  saveField() {
    const identifier = $('#editFieldIdHolder').val();
    const inputField = $('#editFieldInput');

    if (inputField.val().trim() === '') {
      this.toastr.warning('Field value cannot be left blank', 'Warning');
      inputField.focus();
      return;
    }
    console.log('>>>>>> ' + identifier);
    $('#attribute_value_id_' + identifier).html($('#editFieldInput').val());
    $('#attribute_value_id_' + identifier).addClass('bg-warning');
    const editFieldModal = this.editFieldModal.nativeElement;
    const sectionId = $('#attribute_value_id_' + identifier).attr('data-section');
    const attributeId = $('#attribute_value_id_' + identifier).attr('data-attribute');
    console.log(sectionId + '   ' + attributeId);

    const grant = this.currentGrant;
    for (const section of grant.grantDetails.sections) {
      if (section.id === Number(sectionId)) {
        console.log(section);
        for (const attrib of section.attributes) {
          if (attrib.id === Number(attributeId)) {
            console.log(attrib);
            attrib.fieldValue = inputField.val();
            this.grantData.changeMessage(grant);
          }
        }
      }
    }

    $(editFieldModal).modal('hide');

  }

  updateGrant(event: any) {
    /*console.log(this.currentGrant);
    const fieldElem = event.targetElement;
    const fielId = fieldElem.id;
    const fieldVal = fieldElem.value;
    switch (fielId) {
      case 'grantName':
        this.currentGrant.name = fieldVal;
        break;
      case 'grantDesc':
        this.currentGrant.description = fieldVal;
        break;
      case 'grantStart':
        this.currentGrant.startDate = new Date(fieldVal);
        break;
      case 'grantEnd':
        this.currentGrant.endDate = new Date(fieldVal);
        break;
    }
    this._setEditMode(true);
    this.grantData.changeMessage(this.currentGrant);
    console.log(this.currentGrant);*/
  }

  saveGrant() {

    /*const errors = this.validateFields();
    if (errors) {
        this.toastr.error($(this.erroredElement).attr('placeholder') + ' is required', 'Missing entries');
        $(this.erroredElement).focus();
    } else {*/
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-TENANT-CODE': localStorage.getItem('X-TENANT-CODE'),
        'Authorization': localStorage.getItem('AUTH_TOKEN')
      })
    };

    const url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/';

    this.http.put(url, this.currentGrant, httpOptions).subscribe((grant: Grant) => {
          this.originalGrant = JSON.parse(JSON.stringify(grant));
          this.grantData.changeMessage(grant);
          this.currentGrant = grant;
          this._setEditMode(false);
          this.currentSubmission = null;
          //this.checkGrantPermissions();
          this.checkCurrentSubmission();
          this.appComp.autosave = false;
        },
        error => {
          const errorMsg = error as HttpErrorResponse;
          console.log(error);
          this.toastr.error(errorMsg.error.message, errorMsg.error.messageTitle, {
            enableHtml: true
          });
        });
    // }
  }

  private validateFields() {
    const containerFormLements = this.container.nativeElement.querySelectorAll('input[required]:not(:disabled):not([readonly]):not([type=hidden])' +
        ',select[required]:not(:disabled):not([readonly])' +
        ',textarea[required]:not(:disabled):not([readonly])');
    for (let elem of containerFormLements) {
      if (elem.value.trim() === '') {
        this.erroredElement = elem;
        switch ($(this.erroredElement).attr('placeholder')) {
          case 'Field Value':

        }
        return true;
      }
    }
    return false;
  }


  saveSubmissionAndMove(toStateId: number) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-TENANT-CODE': localStorage.getItem('X-TENANT-CODE'),
        'Authorization': localStorage.getItem('AUTH_TOKEN')
      })
    };

    for (const sub of this.currentGrant.submissions) {
      if (sub.id === this.currentSubmission.id) {
        const subStatus = new SubmissionStatus();
        subStatus.id = toStateId;
        sub.submissionStatus = subStatus;
      }
    }

    this.saveGrant();

    /*let url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/'
        + this.currentGrant.id + '/submission/flow/'
        + this.currentSubmission.submissionStatus.id + '/' + toStateId;

    this.http.put(url, this.currentSubmission, httpOptions).subscribe((submission: Submission) => {
          this.submissionData.changeMessage(submission);

          url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/' + this.currentGrant.id;
          this.http.get(url, httpOptions).subscribe((updatedGrant: Grant) => {
            this.grantData.changeMessage(updatedGrant);
            this.editMode = false;
            this.toastr.info('Submission saved with status <b>'
                + this.currentSubmission.submissionStatus.displayName
                + '</b>', 'Submission Saved')
          });
        },
        error => {
          const errorMsg = error as HttpErrorResponse;
          console.log(error);
          this.toastr.error(errorMsg.error.message, errorMsg.error.messageTitle, {
            enableHtml: true
          });
        });*/
  }

  addNewFieldToSection(sectionId: string, sectionName: string) {
    /*const createFieldModal = this.createFieldModal.nativeElement;
    const titleElem = $(createFieldModal).find('#createFieldLabel');
    const idHolderElem = $(createFieldModal).find('#sectionIdHolder');
    $(titleElem).html(sectionName + ' - Create new field');
    $(idHolderElem).val(sectionId);
    $(createFieldModal).modal('show');*/
    for (const section of this.currentGrant.grantDetails.sections) {
      if (section.id === Number(sectionId)) {
        const newAttr = new Attribute();
        newAttr.fieldType = 'string';
        newAttr.fieldName = '';
        newAttr.fieldValue = '';
        newAttr.deletable = true;
        newAttr.required = false;
        newAttr.id = 0 - Math.round(Math.random() * 1000000000);
        section.attributes.push(newAttr);
        break;
      }
    }
    this.checkGrant();
  }


  addField() {
    const fieldName = $('#fieldTitleInput');
    const fieldType = $('#fieldValueInput');
    if (fieldName.val().trim() === '') {
      this.toastr.warning('Field Name cannot be left blank', 'Warning');
      fieldName.focus();
      return;
    }
    const createFieldModal = this.createFieldModal.nativeElement;
    const idHolderElem = $(createFieldModal).find('#sectionIdHolder');
    const grant = this.currentGrant;
    for (const section of grant.grantDetails.sections) {
      if (section.id === Number($(idHolderElem).val())) {

        console.log('found it');
        const attribute = new Attribute();
        attribute.fieldName = fieldName.val();
        attribute.fieldType = fieldType.val();
        attribute.fieldValue = '';
        attribute.id = 0 - Math.round(Math.random() * 10000000000);
        section.attributes.push(attribute);
        break;
      }
    }
    this.grantData.changeMessage(grant);
    fieldName.val('');
    this._setEditMode(true);
    $(createFieldModal).modal('hide');
  }


  addNewSection() {
    const createSectionModal = this.createSectionModal.nativeElement;
    const titleElem = $(createSectionModal).find('#createSectionLabel');
    $(titleElem).html('Add new section');
    $(createSectionModal).modal('show');
  }


  saveSection() {
    const sectionName = $('#sectionTitleInput');
    if (sectionName.val().trim() === '') {
      this.toastr.warning('Section name cannot be left blank', 'Warning');
      sectionName.focus();
      return;
    }
    const createSectionModal = this.createSectionModal.nativeElement;
    const currentSections = this.currentGrant.grantDetails.sections;
    const newSection = new Section();
    newSection.attributes = [];
    newSection.id = 0 - Math.round(Math.random() * 10000000000);
    newSection.sectionName = sectionName.val();
    newSection.deletable = true;

    currentSections.push(newSection);

    this.grantData.changeMessage(this.currentGrant);

    sectionName.val('');
    $('#section_' + newSection.id).css('display', 'block');
    this._setEditMode(true);
    $(createSectionModal).modal('hide');
  }

  saveSectionAndAddNew() {

    const sectionName = $('#sectionTitleInput');
    if (sectionName.val().trim() === '') {
      this.toastr.warning('Section name cannot be left blank', 'Warning');
      sectionName.focus();
      return;
    }

    const createSectionModal = this.createSectionModal.nativeElement;
    const currentSections = this.currentGrant.grantDetails.sections;
    const newSection = new Section();
    newSection.attributes = [];
    newSection.id = 0 - Math.round(Math.random() * 10000000000);
    newSection.sectionName = sectionName.val();

    currentSections.push(newSection);

    this.grantData.changeMessage(this.currentGrant);

    sectionName.val('');
    this.addNewSection();
    sectionName.focus();
  }

  toggleSection(event: Event, sectionId: string) {
    const trgt = $('#section_' + sectionId);
    const trgtIcon = $(event.target);
    trgt.toggle('slow');

    console.log(trgtIcon.hasClass('fa-chevron-down'));
    if (trgtIcon.hasClass('fa-chevron-down')) {
      trgtIcon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
    } else if (trgtIcon.hasClass('fa-chevron-right')) {
      trgtIcon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
    }
  }

  addNewKpi() {
    const kpiModal = this.createKpiModal.nativeElement;
    $(kpiModal).modal('show');
  }

  saveKpi() {
    const kpiModal = this.createKpiModal.nativeElement;
    //const kpiTypeElem = $(this.kpiTypeElem.nativeElement);
    const kpiDesc = $(this.kpiDescriptionelem.nativeElement);
    const id = 0 - Math.round(Math.random() * 10000000000);

    const kpi = new Kpi();
    kpi.id = id;
    kpi.kpiType = this.currentKPIType.toUpperCase();
    kpi.kpiReportingType = this.currentKPIReportingType === null ? null : this.currentKPIReportingType.toUpperCase();
    kpi.description = kpiDesc.val();
    kpi.templates = [];
    kpi.title = kpiDesc.val();

    this.currentGrant.kpis.push(kpi);

    const submissions = this.currentGrant.submissions;
    const grantKpi = new GrantKpi();

    grantKpi.id = id;
    grantKpi.kpiType = this.currentKPIType.toUpperCase();
    grantKpi.kpiReportingType = this.currentKPIReportingType === null ? null : this.currentKPIReportingType.toUpperCase();
    grantKpi.title = kpiDesc.val();
    grantKpi.description = kpiDesc.val();
    grantKpi.frequency = 'YEARLY';
    grantKpi.periodicity = 0;
    grantKpi.scheduled = true;

    for (const sub of this.currentGrant.submissions) {
      if (this.currentKPIType === 'Quantitative') {
        const quantKpi = new QuantitiaveKpisubmission();
        quantKpi.goal = 0;
        quantKpi.toReport = true;
        quantKpi.id = 0 - Math.round(Math.random() * 10000000000);
        quantKpi.grantKpi = grantKpi;

        sub.quantitiaveKpisubmissions.push(quantKpi);
      } else if (this.currentKPIType === 'Qualitative') {
        const qualKpi = new QualitativeKpiSubmission();
        qualKpi.goal = '';
        qualKpi.toReport = true;
        qualKpi.id = 0 - Math.round(Math.random() * 10000000000);
        qualKpi.grantKpi = grantKpi;

        sub.qualitativeKpiSubmissions.push(qualKpi);
      } else if (this.currentKPIType === 'Document') {
        const docKpi = new DocumentKpiSubmission();
        docKpi.goal = '';
        docKpi.toReport = true;
        docKpi.id = 0 - Math.round(Math.random() * 10000000000);
        docKpi.grantKpi = grantKpi;

        sub.documentKpiSubmissions.push(docKpi);
      }
    }
    this.grantData.changeMessage(this.currentGrant);

    this._setEditMode(true);
    kpiDesc.val('');
    $(kpiModal).modal('hide');
  }

  toggleCheckBox(event: Event, type: string, submissionId: number, kpiDataId: number) {
    this._setEditMode(true);
    const checkBoxVal = (<HTMLInputElement>event.currentTarget).checked;
    const submissions = this.currentGrant.submissions;
    switch (type) {
      case 'quantitative':
        for (const submission of submissions) {
          if (submissionId === submission.id) {
            const quantitativeKpis = submission.quantitiaveKpisubmissions;
            for (const quantKpiData of quantitativeKpis) {
              if (kpiDataId === quantKpiData.id) {
                quantKpiData.toReport = checkBoxVal;
              }
            }
          }
        }
        break;
      case 'qualitative':
        for (const submission of submissions) {
          if (submissionId === submission.id) {
            const qualitativeKpis = submission.qualitativeKpiSubmissions;
            for (const qualKpiData of qualitativeKpis) {
              if (kpiDataId === qualKpiData.id) {
                qualKpiData.toReport = checkBoxVal;
              }
            }
          }
        }
        break;
      case 'document':
        for (const submission of submissions) {
          if (submissionId === submission.id) {
            const docKpis = submission.documentKpiSubmissions;
            for (const docKpiData of docKpis) {
              if (kpiDataId === docKpiData.id) {
                docKpiData.toReport = checkBoxVal;
              }
            }
          }
        }
        break;
    }

    this.grantData.changeMessage(this.currentGrant);
    console.log();
  }

  updateGoal(event: Event, type: string, submissionId: number, kpiDataId: number) {
    this._setEditMode(true);
    const submissions = this.currentGrant.submissions;

    for (const submission of submissions) {
      if (submissionId === submission.id) {
        const quantitativeKpis = submission.quantitiaveKpisubmissions;
        for (const quantKpiData of quantitativeKpis) {
          if (kpiDataId === quantKpiData.id) {
            quantKpiData.goal = Number((<HTMLInputElement>event.currentTarget).value);
          }
        }
      }
    }
  }


  submitGrant(toStateId: number) {

    for(let assignment of this.currentGrant.workflowAssignment){
        const status1 = this.appComp.appConfig.workflowStatuses.filter((status) => status.id===assignment.stateId);
        if(assignment.assignments === null || assignment.assignments === undefined || assignment.assignments === 0 && !status1[0].terminal){
           this.confirm(toStateId, 0, [], 0, 'wfassignment', 'Would you like carry out Workflow assignments?')
            return;
        }
    }

    const statusTransition = this.appComp.appConfig.transitions.filter((transition) => transition.fromStateId===this.currentGrant.grantStatus.id && transition.toStateId===toStateId);

    if(statusTransition && statusTransition[0].noteRequired){
        this.openBottomSheetForGrantNotes(toStateId);
    }
  }

  submitAndSaveGrant(toStateId:number, message:String){

  if(!message){
    message='';
  }
  const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'X-TENANT-CODE': localStorage.getItem('X-TENANT-CODE'),
          'Authorization': localStorage.getItem('AUTH_TOKEN')
        })
      };

      const origStatus = this.currentGrant.grantStatus.name;
      let url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/'
          + this.currentGrant.id + '/flow/'
          + this.currentGrant.grantStatus.id + '/' + toStateId;
      this.http.post(url, message, httpOptions).subscribe((grant: Grant) => {
        /*this.loading = false;

        this.router.navigate(['grant']);*/
        //this.grantDataService.changeMessage(grant);
        this.grantData.changeMessage(grant);

        if(!grant.grantTemplate.published && origStatus==='DRAFT'){
        const dialogRef = this.dialog.open(TemplateDialogComponent, {
              data: this.currentGrant.grantTemplate.name
            });

         dialogRef.afterClosed().subscribe(result => {
               if (result.result) {
                 let url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/'+this.currentGrant.id+'/template/'+this.currentGrant.templateId+'/'+result.name;
                     this.http.put(url, {}, httpOptions).subscribe((grant: Grant) => {
                      this.grantData.changeMessage(grant);
                      this.appComp.selectedTemplate = grant.grantTemplate;
                      this.fetchCurrentGrant();
                     });

               } else {
                 dialogRef.close();
               }
             });
          }

      });
  }

  fetchCurrentGrant(){

  const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-TENANT-CODE': localStorage.getItem('X-TENANT-CODE'),
        'Authorization': localStorage.getItem('AUTH_TOKEN')
      })
    };
    
    const url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/' + this.currentGrant.id;
      this.http.get(url, httpOptions).subscribe((updatedGrant: Grant) => {
        this.grantData.changeMessage(updatedGrant);
        this.currentGrant = updatedGrant;
        if(this.currentGrant.actionAuthorities===undefined){
            this.appComp.currentView = 'grants';
            this.router.navigate(['grants']);
        }
        //this.checkGrantPermissions();
        // this.router.navigate(['grant']);
      });
  }


  postionFirstColumn(event: Event) {
    const dist = event.srcElement.scrollLeft;
    $('.first-column').css('left', dist + 'px');
  }

  private _setEditMode(state: boolean) {
    this.editMode = state;
    /*if (state) {
      $(this.actionBlock.nativeElement).prop('disabled',true);
    } else {
      $(this.actionBlock.nativeElement).prop('disabled',false);
    }*/
  }

  scrollHeaderContent(event: Event) {
    const dist = event.srcElement.scrollLeft;
    $('.kpi-block').scrollLeft(dist);
    /*const kpisBlocks = this.elem.nativeElement.querySelectorAll('.kpi-block');
    for (const singleBlock of kpisBlocks) {
      singleBlock.scrollLeft = dist;
    }
    $('.kpi-block').css('left', (0 - dist) + 'px');*/
  }

  scrollChildContent(event: Event) {
    const dist = event.srcElement.scrollLeft;
    const submissionBlock = this.elem.nativeElement.querySelector('.submissions-block');
    submissionBlock.scrollLeft = dist;
    const kpisBlocks = this.elem.nativeElement.querySelectorAll('.kpi-block');
    for (const singleBlock of kpisBlocks) {
      singleBlock.scrollLeft = dist;
    }
    $('.kpi-block').css('left', (0 - dist) + 'px');
  }

  updateSubmission(event: Event, kpiType: string, kpiDataId: number) {
    console.log((<HTMLInputElement>event.target).value + '  ' + kpiType + '  ' + kpiDataId);
    switch (kpiType) {
      case 'QUANTITATIVE':
        for (const kpiData of this.currentSubmission.quantitiaveKpisubmissions) {
          if (kpiData.id === kpiDataId) {
            kpiData.actuals = Number((<HTMLInputElement>event.target).value);
          }
        }
        break;
      case 'QUALITATIVE':
        for (const kpiData of this.currentSubmission.qualitativeKpiSubmissions) {
          if (kpiData.id === kpiDataId) {
            kpiData.actuals = (<HTMLInputElement>event.target).value;
          }
        }
        break;
    }

    this.submissionData.changeMessage(this.currentSubmission);
    console.log(this.currentSubmission);
  }

  updateTitle(event: Event, kpiId: number, kpiType: string) {
    const kpiTitleElem = event.target;
    for (const kpi of this.currentGrant.kpis) {
      if (kpi.id === kpiId) {
        kpi.title = (<HTMLInputElement>kpiTitleElem).value;
        kpi.description = (<HTMLInputElement>kpiTitleElem).value;
      }
    }
    switch (kpiType) {
      case 'QUANTITATIVE':
        for (const sub of this.currentGrant.submissions) {
          for (const quantKpi of sub.quantitiaveKpisubmissions) {
            if (quantKpi.grantKpi.id === kpiId) {
              quantKpi.grantKpi.title = (<HTMLInputElement>kpiTitleElem).value;
              quantKpi.grantKpi.description = (<HTMLInputElement>kpiTitleElem).value;
            }
          }
        }
        break;

      case 'QUALITATIVE':
        for (const sub of this.currentGrant.submissions) {
          for (const qualKpi of sub.qualitativeKpiSubmissions) {
            if (qualKpi.grantKpi.id === kpiId) {
              qualKpi.grantKpi.title = (<HTMLInputElement>kpiTitleElem).value;
              qualKpi.grantKpi.description = (<HTMLInputElement>kpiTitleElem).value;
            }
          }
        }
        break;

      case 'DOCUMENT':
        for (const sub of this.currentGrant.submissions) {
          for (const docKpi of sub.documentKpiSubmissions) {
            if (docKpi.grantKpi.id === kpiId) {
              docKpi.grantKpi.title = (<HTMLInputElement>kpiTitleElem).value;
              docKpi.grantKpi.description = (<HTMLInputElement>kpiTitleElem).value;
            }
          }
        }
        break;
    }
    this._setEditMode(true);
    this.grantData.changeMessage(this.currentGrant);
    console.log(this.currentGrant);
  }


  selectGrantSchedule() {
    const scheduleModal = this.selectScheduleModal.nativeElement;
    $(scheduleModal).modal('show');
  }

  createGrant() {
    const grant = new Grant();
    grant.submissions = new Array<Submission>();
    grant.actionAuthorities = new ActionAuthorities();
    grant.actionAuthorities.permissions = [];
    grant.actionAuthorities.permissions.push('MANAGE');
    grant.organization = this.appComp.appConfig.granteeOrgs[0];
    grant.grantStatus = this.appComp.appConfig.grantInitialStatus;
    grant.substatus = this.appComp.appConfig.submissionInitialStatus;

    grant.id = 0 - Math.round(Math.random() * 10000000000);

    const st = new Date;
    grant.startDate = st;
    grant.stDate = this.datepipe.transform(st, 'yyyy-MM-dd');
    let et = new Date();
    et = new Date(et.setFullYear(et.getFullYear() + 1));
    grant.endDate = et;
    grant.enDate = this.datepipe.transform(et, 'yyyy-MM-dd');


    grant.kpis = new Array<Kpi>();
    grant.grantDetails = new GrantDetails();
    grant.grantDetails.sections = new Array<Section>();
    for (const defaultSection of this.appComp.appConfig.defaultSections) {
      defaultSection.id = 0 - Math.round(Math.random() * 10000000000);
      for (const attr of defaultSection.attributes) {
        attr.id = 0 - Math.round(Math.random() * 10000000000);
        attr.fieldValue = '';
      }
      grant.grantDetails.sections.push(defaultSection);
    }

    /*grant.submissions = new Array<Submission>();
    const tmpDt = new Date();
    for (let i = 0; i < 4; i++) {
        // sub.grant = grant;
        // sub.actionAuthorities = new ActionAuthorities();

        const mnth = tmpDt.getMonth()+ (3*i);
        const dt = new Date(tmpDt.getFullYear(),mnth ,tmpDt.getDate());
        const sub = this._createNewSubmissionAndReturn('Quarter' + (i + 1), dt);
        // sub.grant = grant;
        grant.submissions.push(sub);
    }*/

    this.currentGrant = grant
    this.grantData.changeMessage(grant);
    this.router.navigate(['grant']);
  }

  private _createNewSubmissionAndReturn(title: string, dt1: Date): Submission {
    const sub = new Submission();
    sub.id = 0 - Math.round(Math.random() * 10000000000);
    sub.documentKpiSubmissions = [];
    sub.qualitativeKpiSubmissions = [];
    sub.quantitiaveKpisubmissions = [];
    sub.flowAuthorities = [];
    sub.submissionStatus = this.appComp.appConfig.submissionInitialStatus;
    sub.title = title;


    sub.submitBy = dt1;
    sub.submitDateStr = this.datepipe.transform(dt1, 'yyyy-MM-dd');
    return sub;
  }

  private _addExistingKpisToSubmission(submission: Submission): Submission {
    const quantKpis = new Array<QuantitiaveKpisubmission>();
    const qualKpis = new Array<QualitativeKpiSubmission>();
    const docKpis = new Array<DocumentKpiSubmission>();

    for (const kpi of this.currentGrant.kpis) {
      if (kpi.kpiType === 'QUANTITATIVE') {
        const newQuantKpi = new QuantitiaveKpisubmission();
        newQuantKpi.id = 0 - Math.round(Math.random() * 10000000000);
        newQuantKpi.goal = 0;
        newQuantKpi.grantKpi = kpi;
        newQuantKpi.actuals = 0;
        newQuantKpi.toReport = true;
        newQuantKpi.submissionDocs = [];
        // newQuantKpi.submission = JSON.parse(JSON.stringify(submission));
        newQuantKpi.notesHistory = [];
        newQuantKpi.note = '';
        quantKpis.push(newQuantKpi);
      } else if (kpi.kpiType === 'QUALITATIVE') {
        const newQualKpi = new QualitativeKpiSubmission();
        newQualKpi.id = 0 - Math.round(Math.random() * 10000000000);
        newQualKpi.goal = '';
        newQualKpi.grantKpi = kpi;
        newQualKpi.actuals = '';
        newQualKpi.toReport = true;
        newQualKpi.submissionDocs = [];
        // newQualKpi.submission = JSON.parse(JSON.stringify(submission));
        newQualKpi.notesHistory = [];
        newQualKpi.note = '';
        qualKpis.push(newQualKpi);
      } else if (kpi.kpiType === 'DOCUMENT') {
        const newDocKpi = new DocumentKpiSubmission();
        newDocKpi.id = 0 - Math.round(Math.random() * 10000000000);
        newDocKpi.goal = '';
        newDocKpi.grantKpi = kpi;
        newDocKpi.actuals = '';
        newDocKpi.toReport = true;
        newDocKpi.submissionDocs = [];
        // newDocKpi.submission = JSON.parse(JSON.stringify(submission));
        newDocKpi.notesHistory = [];
        newDocKpi.note = '';
        docKpis.push(newDocKpi);
      }
    }
    submission.quantitiaveKpisubmissions = quantKpis;
    submission.qualitativeKpiSubmissions = qualKpis;
    submission.documentKpiSubmissions = docKpis;
    return submission;
  }

  private _adjustHeights() {
    console.log('adjusting heights');
    /*for (const elem of $('[data-id]')) {
        $(elem).css('height', $('#kpi_title_' + $(elem).attr('data-id')).outerHeight() + 'px');
        // console.log($(elem).css('height'));
    }*/
  }

  private _setFlowButtonColors() {
    const flowActionBtns = $('[name="flowActionBtn"]');
    for (let elem = 0; elem < flowActionBtns.length; elem++) {
      // this.colors = new Colors();
      const color = this.colors.colorArray[elem];
      $(flowActionBtns[elem]).css('background-color', color);
    }
  }


  checkGrant() {
    if (JSON.stringify(this.currentGrant) === JSON.stringify(this.originalGrant)) {
      this._setEditMode(false);
    } else {
      this._setEditMode(true);
    }
  }

  openBottomSheet(kpiId: number, title: string, templates: Template[], canManage: boolean): void {

    const fileTemplates = new FileTemplates();
    fileTemplates.kpiId = kpiId;
    fileTemplates.subTitle = title;
    fileTemplates.grantId = this.currentGrant.id;
    fileTemplates.title = 'Template Library';
    fileTemplates.templates = templates;
    fileTemplates.canManage = canManage;

    const _bSheet = this._bottomSheet.open(BottomsheetComponent, {
      hasBackdrop: false,
      data: fileTemplates
    });

    _bSheet.afterDismissed().subscribe(result => {
      console.log(this.currentGrant);
      this.checkGrant();
    });
  }

  openBottomSheetForSubmittionAttachments(kpiDataId: number
      , kpiDataType: string
      , title: string
      , attachments: Doc[]
      , canManage: boolean): void {

    const attachmentTemplates = new AttachmentTemplates();
    attachmentTemplates.kpiDataId = kpiDataId;
    attachmentTemplates.kpiDataType = kpiDataType;
    attachmentTemplates.subTitle = title;
    attachmentTemplates.grantId = this.currentGrant.id;
    attachmentTemplates.title = 'KPI Attachments';
    attachmentTemplates.docs = attachments;
    attachmentTemplates.canManage = canManage;

    const _bSheet = this._bottomSheet.open(BottomsheetAttachmentsComponent, {
      hasBackdrop: false,
      data: attachmentTemplates
    });

    _bSheet.afterDismissed().subscribe(result => {
      console.log(this.currentGrant);
      this.checkGrant();
    });
  }

  openBottomSheetForGrantNotes(toStateId: number): void {

    const _bSheet = this.dialog.open(GrantNotesComponent, {
      hasBackdrop: false,
      data: {canManage:true,currentGrant: this.currentGrant, originalGrant: this.appComp.originalGrant},
      panelClass: 'grant-notes-class'
    });

    _bSheet.afterClosed().subscribe(result => {
      if(result.result){
        this.submitAndSaveGrant(toStateId,result.message);
      }
    });
  }

  performAction(event: any) {
    const selectedOption = event.value;
    switch (selectedOption) {
      case '1':
        let newSubmission = this._createNewSubmissionAndReturn('Submission Title', new Date());
        // newSubmission.grant = this.currentGrant;
        newSubmission = this._addExistingKpisToSubmission(newSubmission);
        this.currentGrant.submissions.splice(0, 0, newSubmission);
        this.toastr.info('New submission period appended to existing list', 'Submission Period Added');
        break;
      case '2':
        const tmpDt = new Date();
        for (let i = 0; i < 4; i++) {
          // sub.grant = grant;
          // sub.actionAuthorities = new ActionAuthorities();

          const mnth = tmpDt.getMonth() + (3 * i);
          const dt = new Date(tmpDt.getFullYear(), mnth, tmpDt.getDate());
          let sub = this._createNewSubmissionAndReturn('Quarter' + (i + 1), dt);
          sub = this._addExistingKpisToSubmission(sub);
          // sub.grant = grant;
          this.currentGrant.submissions.push(sub);
        }
        this.toastr.info('Quarterly Submissions added', 'Submission Periods Added');
        break;
      case '3':
        this.confirm(0, 0, [], 0, 'clearSubmissions', ' all Submissions')
        break;
    }


    this.checkGrant();
    event.source.value = '';
  }


  clearSubmissions() {
    this.currentGrant.submissions = [];
  }


  openAttachmentsNav() {
    const attachmentsSN = this.attachmentsSideNav._elementRef.nativeElement;
    this.attachmentsSideNavOpened = true;
  }

  closeAttachmentsSideNav() {
    this.attachmentsSideNavOpened = false;
  }


  setNewOrg(event: Event) {
    console.log(event);
  }

  deleteSection(secId: number) {
    const index = this.currentGrant.grantDetails.sections.findIndex(section => section.id === Number(secId));
    this.currentGrant.grantDetails.sections.splice(index, 1);
    this.checkGrant();
  }

  handleSpacebar(ev: Event) {

    console.log(ev);
    ev.stopImmediatePropagation();

  }

  setSubmissionDate(sub: Submission, event: MatDatepickerInputEvent<any>) {
    sub.submitBy = event.value;
    sub.submitDateStr = this.datepipe.transform(event.value, 'yyyy-MM-dd');
    this.checkGrant();
  }

  setKpiTypeSection(event) {
    this.currentKPIType = event.value;
    if (this.currentKPIReportingType != 'Quantitative') {
      this.currentKPIReportingType = null;
    } else {
      this.currentKPIReportingType = 'Activity';
    }
  }

  setKpiReportingTypeSection(event) {
    this.currentKPIReportingType = event.value;

    console.log(this.currentKPIType + ' - ' + this.currentKPIReportingType);
  }


    saveAsPdf() {
    const preview = this.grantSummary.nativeElement;
    var opt = {
      margin:       [0.7,0,1,0],
      filename:     this.currentGrant.name+'.pdf',
      image:        { type: 'png', quality: 1 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    var worker = html2pdf().set(opt).from(preview).save();
    /* console.log(preview.innerHTML);
    html2canvas(preview).then(function(canvas) {
        var img = canvas.toDataURL("image/png");
        var imgWidth = 210;
      var pageHeight = 270;
      var imgHeight = canvas.height * imgWidth / canvas.width;
      var heightLeft = imgHeight;

      var doc = new jsPDF('p', 'mm');
      var position = 0;

      doc.addImage(img, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(img, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.save( 'file.pdf');﻿
    }); */

/*        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                'X-TENANT-CODE': localStorage.getItem('X-TENANT-CODE'),
                'Authorization': localStorage.getItem('AUTH_TOKEN')
            })
        };

        const grantSummaryElem = $("html").html();

        const url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/'+this.currentGrant.id+"/pdf";

        this.http.post(url, grantSummaryElem, httpOptions).subscribe((data: PdfDocument) => {
            console.log(data);
            window.open("data:application/octet-stream;charset=utf-16le;base64,"+data.data);
        }); */
    }

    getTabularData(elemId: number, data: TableData[]){
      let html = '<table width="100%" border="1"><tr>';
      const tabData = data;
      html += '<td>&nbsp;</td>'; 
      for(let i=0; i< tabData[0].columns.length;i++){
       
          
          //if(tabData[0].columns[i].name.trim() !== ''){
            html+='<td>' + tabData[0].columns[i].name + '</td>';
          //}
      }
      html += '</tr>';
      for(let i=0; i< tabData.length;i++){
       
          html += '<tr><td>' + tabData[i].name + '</td>';
          for(let j=0; j < tabData[i].columns.length; j++){
            //if(tabData[i].columns[j].name.trim() !== ''){
              html+='<td>' + tabData[i].columns[j].value + '</td>';
            //}
          }
          html += '</tr>';
      }

      html += '</table>'
      //document.getElementById('attribute_' + elemId).innerHTML = '';
      //document.getElementById('attribute_' + elemId).append('<H1>Hello</H1>');
      return html;
    }

    datePickerSelected(event:Event){
        console.log(event);
    }

    showWorkflowAssigments(toStateId){
      const wfModel = new WorkflowAssignmentModel();
       wfModel.users = this.appComp.appConfig.tenantUsers;
       wfModel.workflowStatuses = this.appComp.appConfig.workflowStatuses;
       wfModel.workflowAssignment = this.currentGrant.workflowAssignment;
       wfModel.grant = this.currentGrant;
        const dialogRef = this.dialog.open(WfassignmentComponent, {
              data: wfModel,
              width: '600px'
            });

            dialogRef.afterClosed().subscribe(result => {
              if (result.result) {
                const ass:WorkflowAssignment[] = [];
                for(let data of result.data){
                    const wa = new WorkflowAssignment();
                    wa.id=data.id;
                    wa.assignments = data.userId;
                    ass.push(wa);
                }

                const httpOptions = {
                            headers: new HttpHeaders({
                                'Content-Type': 'application/json',
                                'X-TENANT-CODE': localStorage.getItem('X-TENANT-CODE'),
                                'Authorization': localStorage.getItem('AUTH_TOKEN')
                            })
                        };

                        let url = '/api/user/' + this.appComp.loggedInUser.id + '/grant/'
                            + this.currentGrant.id + '/assignment';
                        this.http.post(url, ass, httpOptions).subscribe((grant: Grant) => {
                            this.grantData.changeMessage(grant);
                            this.currentGrant = grant;
                            this.submitGrant(toStateId);
                        });
              } else {
                dialogRef.close();
              }
              });
      }
}
