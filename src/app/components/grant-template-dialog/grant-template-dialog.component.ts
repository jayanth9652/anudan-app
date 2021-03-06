import {Component, Inject, OnInit, ViewChild, ElementRef} from '@angular/core';
import {GrantTemplate} from '../../model/dahsboard';

import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatButtonModule} from '@angular/material';

@Component({
  selector: 'app-grant-template-dialog',
  templateUrl: './grant-template-dialog.component.html',
  styleUrls: ['./grant-template-dialog.component.scss']
})
export class GrantTemplateDialogComponent implements OnInit {

  @ViewChild('templateHolder') templateHolder: ElementRef;
  selected:any;
  selectedTemplate: GrantTemplate;

  constructor(public dialogRef: MatDialogRef<GrantTemplateDialogComponent>
      , @Inject(MAT_DIALOG_DATA) public templates: GrantTemplate[]) {
    this.dialogRef.disableClose = true;
    this.selected=String(this.templates.filter(x => x.defaultTemplate===true)[0].id);
  }

  ngOnInit() {
    this.selected = this.templates.filter(x => x.defaultTemplate===true)[0].id;
    this.templates.sort((a, b) => Number(a)-Number(b));
    this.selectedTemplate = this.templates.filter(x => x.defaultTemplate===true)[0];
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
  let selectedTemplate;
    for(let template of this.templates){
        if(template.id === Number(this.selected)){
            selectedTemplate = template;
            break;
        }
    }
    this.dialogRef.close({result:true,selectedTemplate:selectedTemplate});
  }

  showDesc(){
    console.log('here');
  }

  setSelectedTemplate(id,ev: Event){
    this.selected = id;
    this.selectedTemplate = this.templates.filter(a => a.id===id)[0];
  }
}
