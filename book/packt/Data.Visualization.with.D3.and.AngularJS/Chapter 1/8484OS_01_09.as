[SWF(width="50", height="30")] 
public class Vis extends Sprite 
{ 
  public function Vis() 
  {
    // Define the dataset
    var data:Array = [15, 25, 35];
    for each (var d:int in data) {
      var sprite:Sprite = new Sprite(); 
      // Draw and color the circles
      sprite.graphics.beginFill(0xff0000, 1.0); 
      sprite.graphics.drawCircle(0, 0, 5); 
      this.addChild(sprite); 
      // Set the coordinates of the circle
      sprite.x = d; 
      sprite.y = 15; 
    }
  } 
} 
